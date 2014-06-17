var crypto = require('crypto');

var AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
var HKDF = require('../../crypto/HKDF');

var CircuitExtender = (function () {
    function CircuitExtender(reactionTimeInMs, reactionTimeFactor, connectionManager, messageCenter, encDecHandler) {
        this._reactionTimeInMs = 0;
        this._reactionTimeFactor = 0;
        this._connectionManager = null;
        this._messageCenter = null;
        this._encDecHandler = null;
        this._nodes = [];
        this._circuitId = null;
        this._currentDiffieHellman = null;
        this._currentCallback = null;
        this._currentUUID = null;
        this._expectReactionFrom = null;
        this._currentReactionTimeout = 0;
        this._currentNodeToExtendWith = null;
        this._eventListener = null;
        this._reactionTimeInMs = reactionTimeInMs;
        this._reactionTimeFactor = reactionTimeFactor;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._encDecHandler = encDecHandler;

        this._nodes = this._encDecHandler.getNodes();
    }
    CircuitExtender.prototype.extend = function (nodeToExtendWith, additiveNodes, callback) {
        var _this = this;
        var isFirst = this._nodes.length === 0;

        this._currentCallback = callback;

        if (isFirst) {
            this._circuitId = crypto.pseudoRandomBytes(16).toString('hex');

            this._expectReactionFrom = nodeToExtendWith;

            this._eventListener = function (ip, message) {
                _this._onReaction(ip, message);
            };

            this._messageCenter.on('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
        }

        this._currentUUID = crypto.pseudoRandomBytes(16).toString('hex');

        this._currentNodeToExtendWith = nodeToExtendWith;

        this._currentDiffieHellman = crypto.getDiffieHellman('modp14');

        var dhPublicKey = this._currentDiffieHellman.generateKeys();

        AdditiveSharingScheme.getShares(dhPublicKey, additiveNodes.length + 1, 2048, function (shares) {
            for (var i = 0, l = additiveNodes.length; i < l; i++) {
                _this._messageCenter.sendAdditiveSharingMessage(additiveNodes[i], nodeToExtendWith.ip, nodeToExtendWith.port, _this._currentUUID, shares[i]);
            }

            // now only the last share is missing. If this is the first one, directly send it to the node, else layer encrypt and send
            // RELAY_EXTEND_CELL
            // then, set the timeout
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

    CircuitExtender.prototype._onReaction = function (fromIp, message) {
        if (this._expectReactionFrom.ip === fromIp) {
            if (this._currentReactionTimeout) {
                global.clearTimeout(this._currentReactionTimeout);
                this._currentReactionTimeout = 0;
            }

            if (message.getUUID() !== this._currentUUID) {
                this._extensionError('Expected UUID does not match received UUID.');
            } else {
                if (message.isRejected()) {
                    this._handleRejection();
                } else {
                    var secret = this._currentDiffieHellman.computeSecret(message.getDHPayload());
                    var sha1 = crypto.createHash('sha1');

                    sha1.update(secret);

                    if (sha1.digest('hex') === message.getSecretHash().toString('hex')) {
                        // all well, calculate keys, set the node on _nodes and _encDecHandler and callback
                        var hkdf = new HKDF('sha256', secret);

                        var keysConcat = hkdf.derive(256, new Buffer(message.getUUID(), 'hex'));

                        var outgoingKey = keysConcat.slice(0, 128);
                        var incomingKey = keysConcat.slice(128);

                        var newNode = {
                            incomingKey: incomingKey,
                            outgoingKey: outgoingKey,
                            ip: this._currentNodeToExtendWith.ip,
                            port: this._currentNodeToExtendWith.port
                        };

                        if (!this._nodes.length) {
                            newNode.circuitId = this._circuitId;
                        }

                        this._encDecHandler.addNode(newNode);

                        this._currentCallback(null, false, newNode);
                    } else {
                        this._extensionError('Hashes of shared secret do not match.');
                    }
                }
            }
        }
    };

    CircuitExtender.prototype._handleRejection = function () {
        if (!this._nodes.length) {
            this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
        }

        this._currentCallback(null, true, null);
    };

    CircuitExtender.prototype._extensionError = function (errMsg) {
        if (!this._nodes.length) {
            this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
        }

        this._currentCallback(new Error('CircuitExtender: ' + errMsg), false, null);
    };
    return CircuitExtender;
})();

module.exports = CircuitExtender;
//# sourceMappingURL=CircuitExtender.js.map
