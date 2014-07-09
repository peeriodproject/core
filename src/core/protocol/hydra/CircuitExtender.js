var crypto = require('crypto');

var AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
var HKDF = require('../../crypto/HKDF');

/**
* CircuitExtenderInterface implementation.
*
* @class core.protocol.hydra.CircuitExtender
* @implements core.protocol.hydra.CircuitExtenderInterface
*
* @param {number} reactionTimeInMs The number of milliseconds used as a basis for how long the instance waits for a response until the request is considered a failure.
* @param {number} reactionTimeFactor For each relay node, the reaction time base is multiplied with this factor to adapt to the circuit's length.
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter  A working hydra message center instance.
* @param {core.protocol.hydra.LayeredEncDecHandlerInterface} encDecHandler The layered encryption/decryption handler of the circuit which should be extended.
*/
var CircuitExtender = (function () {
    function CircuitExtender(reactionTimeInMs, reactionTimeFactor, connectionManager, messageCenter, encDecHandler) {
        /**
        * Stores the circuitId from which responses are expected. This is usually generated on the first extension and then
        * stays the same (only changes if the first node rejects the request, and `extend` is called again.
        *
        * @member {string} core.protocol.hydra.CircuitExtender~_circuitId
        */
        this._circuitId = null;
        /**
        * Listener on the termination event of circuits.
        *
        * @member {Function} core.protocol.hydra.CircuitExtender~_circuitTerminationListener
        */
        this._circuitTerminationListener = null;
        /**
        * The working hydra connection manager instance.
        *
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.CircuitExtender~_connectionManager
        */
        this._connectionManager = null;
        /**
        * Stores the current callback for the active extension.
        *
        * @member {Function} core.protocol.hydra.CircuitExtender~_currentCallback
        */
        this._currentCallback = null;
        /**
        * Stores the current Diffie-Hellman object for the active extension.
        *
        * @member {crypto.DiffieHellman} core.protocol.hydra.CircuitExtender~_currentDiffieHellman
        */
        this._currentDiffieHellman = null;
        /**
        * Stores the current node to extend with for the active extension.
        *
        * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.CircuitExtender~_currentNodeToExtendWith
        */
        this._currentNodeToExtendWith = null;
        /**
        * Stores the current timeout object for the active extension.
        *
        * @member {number} core.protocol.hydra.CircuitExtender~_currentReactionTimeout
        */
        this._currentReactionTimeout = 0;
        /**
        * Stores the current UUID for the active extension.
        *
        * @member {string} core.protocol.hydra.CircuitExtender~_currentUUID
        */
        this._currentUUID = null;
        /**
        * The layered encryption/decryption handler of the circuit this CircuitExtender instance is assigned to.
        *
        * @member {core.protocol.hydra.LayeredEncDecHandlerInterface} core.protocol.hydra.CircuitExtender~_encDecHandler
        */
        this._encDecHandler = null;
        /**
        * Stores the event listener which is set on the message center for CELL_CREATED_REJECT_{circuitId} messages.
        * Normally this listener doesn't change, but it gets detached if an error occurs or the first node to extend with
        * rejects the request (and thus the circuitId changes)
        *
        * @member {Function} core.protocol.hydra.CircuitExtender~_eventListener
        */
        this._eventListener = null;
        /**
        * Stores the node from whom a reaction is expected. This is usally the very first node to extend with, and does not
        * change (as it is also the first node in the circuit then).
        *
        * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.CircuitExtender~_expectReactionFrom
        */
        this._expectReactionFrom = null;
        /**
        * Indicates whether an extension process is currently going on.
        *
        * @member {boolean} core.protocol.hydra.CircuitExtender~_isExtending
        */
        this._isExtending = false;
        /**
        * The working hydra message center instance.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.CircuitExtender~_messageCenter
        */
        this._messageCenter = null;
        /**
        * Stores the node array from the layered encryption/decryption handler.
        *
        * @member {core.protocol.hydra.HydraNodeList} core.protocol.hydra.CircuitExtender~_nodes
        */
        this._nodes = [];
        /**
        * The reaction time factor. (see above)
        *
        * @member {number} core.protocol.hydra.CircuitExtender~_reactionTimeFactor
        */
        this._reactionTimeFactor = 0;
        /**
        * The reaction time base in milliseconds. (see above)
        *
        * @member {number} core.protocol.hydra.CircuitExtender~_reactionTimeInMs
        */
        this._reactionTimeInMs = 0;
        this._reactionTimeInMs = reactionTimeInMs;
        this._reactionTimeFactor = reactionTimeFactor;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._encDecHandler = encDecHandler;
        this._nodes = this._encDecHandler.getNodes();
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    CircuitExtender.prototype.getCircuitId = function () {
        return this._circuitId;
    };

    CircuitExtender.prototype.getExpectReactionFrom = function () {
        return this._expectReactionFrom;
    };

    CircuitExtender.prototype.getNodes = function () {
        return this._nodes;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    CircuitExtender.prototype.extend = function (nodeToExtendWith, additiveNodes, callback) {
        var _this = this;
        var isFirst = this._nodes.length === 0;

        this._currentCallback = callback;
        this._isExtending = true;

        if (isFirst) {
            this._circuitId = crypto.pseudoRandomBytes(16).toString('hex');
            this._expectReactionFrom = nodeToExtendWith;
            this._expectReactionFrom.circuitId = this._circuitId;

            this._eventListener = function (from, message, decrypted) {
                _this._onReaction(from, message, decrypted);
            };

            this._circuitTerminationListener = function (circuitId) {
                if (circuitId === _this._circuitId) {
                    _this._onCircuitTermination();
                }
            };

            this._messageCenter.on('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
            this._connectionManager.on('circuitTermination', this._circuitTerminationListener);
        }

        this._currentUUID = crypto.pseudoRandomBytes(16).toString('hex');
        this._currentNodeToExtendWith = nodeToExtendWith;

        var dhPublicKey = this._getDiffieHellmanAndReturnPublicKey();

        AdditiveSharingScheme.getShares(dhPublicKey, additiveNodes.length + 1, 256, function (shares) {
            for (var i = 0, l = additiveNodes.length; i < l; i++) {
                _this._messageCenter.sendAdditiveSharingMessage(additiveNodes[i], nodeToExtendWith.ip, nodeToExtendWith.port, _this._currentUUID, shares[i]);
            }

            if (isFirst) {
                _this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(nodeToExtendWith, _this._circuitId, _this._currentUUID, shares[shares.length - 1]);
            } else {
                _this._messageCenter.spitoutRelayCreateCellMessage(_this._encDecHandler, nodeToExtendWith.ip, nodeToExtendWith.port, _this._currentUUID, shares[shares.length - 1], _this._circuitId);
            }

            _this._currentReactionTimeout = global.setTimeout(function () {
                _this._extensionError('Timed out');
            }, _this._reactionTimeInMs * Math.pow(_this._reactionTimeFactor, _this._nodes.length));
        });
    };

    /**
    * Clears the reaction timeout (if there is one)
    *
    * @method core.protocol.hydra.CircuitExtender~_clearReactionTimeout
    */
    CircuitExtender.prototype._clearReactionTimeout = function () {
        if (this._currentReactionTimeout) {
            global.clearTimeout(this._currentReactionTimeout);
            this._currentReactionTimeout = 0;
        }
    };

    /**
    * This hack is a workaround around some pretty weird bug in either node.js or OpenSSL where
    * the diffie hellman public key returned is missing one byte sometimes.
    *
    * @method core.protocol.hydra.CircuitExtender~_getDiffieHellmanAndReturnPublicKey
    *
    * @returns {Buffer}
    */
    CircuitExtender.prototype._getDiffieHellmanAndReturnPublicKey = function () {
        this._currentDiffieHellman = crypto.getDiffieHellman('modp14');
        var dhPublicKey = this._currentDiffieHellman.generateKeys();

        if (dhPublicKey.length !== 256) {
            return this._getDiffieHellmanAndReturnPublicKey();
        } else {
            return dhPublicKey;
        }
    };

    /**
    * @method core.protocol.hydra.CircuitExtender~_doCallback
    *
    * @param {Error} err
    * @param {boolean} isRejected
    * @param {core.protocol.hydra.HydraNode} newNode
    */
    CircuitExtender.prototype._doCallback = function (err, isRejected, newNode) {
        this._isExtending = false;
        this._currentCallback(err, isRejected, newNode);
    };

    /**
    * Handles an errorous request by detaching the event listener and invoking the callback with an error.
    *
    * @method core.protocol.hydra.CircuitExtender~_extensionError
    *
    * @param {string} errMsg Message for the passed in error.
    */
    CircuitExtender.prototype._extensionError = function (errMsg) {
        console.log(errMsg);
        this._removeMessageListener();
        this._removeTerminationListener();

        if (!this._nodes.length) {
            this._connectionManager.removeFromCircuitNodes(this._currentNodeToExtendWith);
        }

        this._doCallback(new Error('CircuitExtender: ' + errMsg), false, null);
    };

    /**
    * Handles a rejected request by checking if the node to extend with was the first node. If yes, the listener on
    * the circuitId must be detached to 'make way' for subsequent requests.
    *
    * At last the callbak is invoked with `isRejected`-flag set to true.
    *
    * @method core.protocol.hydra.CircuitExtender~_handleRejection
    */
    CircuitExtender.prototype._handleRejection = function () {
        if (!this._nodes.length) {
            this._removeMessageListener();
            this._removeTerminationListener();
            this._connectionManager.removeFromCircuitNodes(this._currentNodeToExtendWith);
        }

        this._doCallback(null, true, null);
    };

    /**
    * Method which gets invoked if the socket of the first node is terminated.
    * Removes the listeners and if the node has not been added to the circuit, considers the extension
    * as errorous.
    *
    * @method core.protocol.hydra.CircuitExtender~_onCircuitTermination
    */
    CircuitExtender.prototype._onCircuitTermination = function () {
        this._removeMessageListener();
        this._removeTerminationListener();

        if (this._isExtending) {
            this._clearReactionTimeout();
            this._extensionError('Circuit socket terminated');
        }
    };

    /**
    * Handles the reaction message, i.e. a CELL_CREATED_REJECTED message event emitted on the expected circuitId.
    * It checks if the IP the message comes from matches the expected IP.
    * If yes, and the UUID also matches, the Diffie-Hellman secret is computed and the SHA-1 hash compared to the
    * received hash. If either UUID or SHA-1 hash do not match, the extension is considered a failure and errors out.
    *
    * Otherwise the extension is considered a success and the symmetric keys are derived via the HMAC based
    * extract-and-expand function (HKDF). The new node is added to the layered enc/dec handler and then passed to the
    * invoked callback.
    *
    * @method core.protocol.hydra.CircuitExtender~_onReaction
    *
    * @param {string} fromIp The IP address the reaction message originates from.
    * @param {core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface} message The reaction message.
    */
    CircuitExtender.prototype._onReaction = function (from, message, decrypted) {
        if (this._expectReactionFrom === from && (!this._nodes.length || decrypted)) {
            this._clearReactionTimeout();

            if (message.getUUID() !== this._currentUUID) {
                this._extensionError('Expected UUID does not match received UUID.');
            } else {
                if (message.isRejected()) {
                    this._handleRejection();
                } else {
                    var secret = this._currentDiffieHellman.computeSecret(message.getDHPayload());
                    var sha1 = crypto.createHash('sha1');

                    sha1.update(secret);

                    var digest = sha1.digest('hex');

                    if (digest === message.getSecretHash().toString('hex')) {
                        var hkdf = new HKDF('sha256', secret);
                        var keysConcat = hkdf.derive(48, new Buffer(message.getUUID(), 'hex'));
                        var outgoingKey = keysConcat.slice(0, 16);
                        var incomingKey = keysConcat.slice(16, 32);
                        var feedingIdentifier = keysConcat.slice(32).toString('hex');

                        var newNode = this._nodes.length ? {
                            ip: this._currentNodeToExtendWith.ip,
                            port: this._currentNodeToExtendWith.port
                        } : this._currentNodeToExtendWith;

                        newNode.incomingKey = incomingKey;
                        newNode.outgoingKey = outgoingKey;
                        newNode.feedingIdentifier = feedingIdentifier;

                        this._encDecHandler.addNode(newNode);

                        this._doCallback(null, false, newNode);
                    } else {
                        this._extensionError('Hashes of shared secret do not match.');
                    }
                }
            }
        }
    };

    /**
    * Removes the listener on the CELL_CREATED_REJECTED event related to this circuit's circuitId.
    *
    * @method core.protocol.hydra.CircuitExtender~_removeMessageListener
    */
    CircuitExtender.prototype._removeMessageListener = function () {
        if (this._eventListener) {
            this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
            this._eventListener = null;
        }
    };

    /**
    * Removes the listener on the `circuitTermination` event of the connection manager.
    *
    * @method core.protocol.hydra.CircuitExtender~_removeTerminationListener
    */
    CircuitExtender.prototype._removeTerminationListener = function () {
        if (this._circuitTerminationListener) {
            this._connectionManager.removeListener('circuitTermination', this._circuitTerminationListener);
            this._circuitTerminationListener = null;
        }
    };
    return CircuitExtender;
})();

module.exports = CircuitExtender;
//# sourceMappingURL=CircuitExtender.js.map
