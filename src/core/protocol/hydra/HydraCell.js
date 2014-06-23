var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

/**
* HydraCellInterface implementation.
*
* @class core.protocol.hydra.HydraCell
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.HydraCellInterface
*
* @param {core.protocol.hydra.HydraNode} predecessor The predecessor node of the cell. Must have a socket identifier, shared keys, circuit ID, etc.
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration.
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter A working hydra message center instance.
* @param {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} decryptionFactory Factory for decrypting single messages.
* @param {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} encryptionFactory Factory for encrypting single messages.
*/
var HydraCell = (function (_super) {
    __extends(HydraCell, _super);
    function HydraCell(predecessorNode, hydraConfig, connectionManager, messageCenter, decryptionFactory, encryptionFactory) {
        _super.call(this);
        /**
        * Stores the connection manager.
        *
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCell~_connectionManager
        */
        this._connectionManager = null;
        /**
        * Stores the timeout which gets set when the cell is extended.
        * Represents the time to wait for a response to the request until the cell is torn down.
        *
        * @member {number|NodesJS.Timeout} core.protocol.hydra.HydraCell~_currentExtensionTimeout
        */
        this._currentExtensionTimeout = 0;
        /**
        * The UUID of the additive sharing scheme used for extending the cell. This is extracted from the
        * RELAY_CREATE_CELL message
        *
        * @member {string} core.protocol.hydra.HydraCell~_currentExtensionUuid
        */
        this._currentExtensionUuid = null;
        /**
        * The decryption factory for single messages.
        *
        * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.hydra.HydraCell~_decrypter
        */
        this._decrypter = null;
        /**
        * The event listener for ENCRYPTED_DIGEST events. This is set up as soon as a successor has been successfully added.
        *
        * @member {Function} core.protocol.hydra.HydraCell~_digestListener
        */
        this._digestListener = null;
        /**
        * The encryption factory for single messages.
        *
        * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.hydra.HydraCell~_encrypter
        */
        this._encrypter = null;
        /**
        * The listener on RELAY_CREATE_CELL messages (pseudotype of ADDITIVE_SHARING).
        *
        * @member {Function} core.protocol.hydra.HydraCell~_extensionListener
        */
        this._extensionListener = null;
        /**
        * The number of milliseconds a node has time to react before the extension is considered unsuccessful
        *
        * @member {number} core.protocol.hydra.HydraCell~_extensionReactionInMs
        */
        this._extensionReactionInMs = 0;
        /**
        * The event listener on the CELL_CREATED_REJECTED message. Gets bound as soon as the cell is extended and unbound
        * when the cell is torn down or the response message has rolled in.
        *
        * @member {Function} core.protocol.hydra.HydraCell~_extensionResponseListener
        */
        this._extensionResponseListener = null;
        /**
        * A flag indicating whether the cell has been torn down (and is thus rendered unusable) or not.
        *
        * @member {boolean} core.protocol.hydra.HydraCell~_isTornDown
        */
        this._isTornDown = false;
        /**
        * Stores the message center instance.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCell~_messageCenter
        */
        this._messageCenter = null;
        /**
        * The predecessor node of the cell.
        *
        * Remember: Hydra circuits and cells are object sensitive! If you change the object or alter it, many things will break!
        *
        * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.HydraCell~_predecessor
        */
        this._predecessor = null;
        /**
        * The event listener on ENCRYPTED_SPITOUT functions. Gets bound on creation and unbound on tearing down.
        *
        * @member {Function} core.protocol.hydra.HydraCell~_spitoutListener
        */
        this._spitoutListener = null;
        /**
        * The successor node of the cell. Can be `null` if it does not have a successor
        *
        * Remember: Hydra circuits and cells are object sensitive! If you change the object or alter it, many things will break!
        *
        * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.HydraCell~_successor
        */
        this._successor = null;
        /**
        * The listener on the 'circuitTermination' event.
        * Bound on creation, unbound on tearing down.
        *
        * @member {Function} core.protocol.hydra.HydraCell~_terminationListener
        */
        this._terminationListener = null;

        this._predecessor = predecessorNode;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._decrypter = decryptionFactory;
        this._encrypter = encryptionFactory;

        this._extensionReactionInMs = hydraConfig.get('cell.extensionReactionInSeconds') * 1000;

        this._setupListeners();
    }
    /**
    * Clears the timeout of a cell extension (if present)
    *
    * @method core.protocol.hydra.HydraCell~_clearExtensionTimeout
    */
    HydraCell.prototype._clearExtensionTimeout = function () {
        if (this._currentExtensionTimeout) {
            global.clearTimeout(this._currentExtensionTimeout);
            this._currentExtensionTimeout = 0;
        }
    };

    /**
    * Sends on an ENCRYPTED_DIGEST message with a given payload, which gets encrypted
    * If the client is the initiator of the ENCRYPTED_DIGEST message onion, `isReceiver` must be `true`.
    *
    * @method core.protocol.hydra.HydraCell~_digestBuffer
    *
    * @param {Buffer} buffer The payload to encrypt and pipe through the circuit.
    * @param {boolean} isReceiver Indicates if the client is the initiator of the message.
    */
    HydraCell.prototype._digestBuffer = function (buffer, isReceiver) {
        var _this = this;
        if (typeof isReceiver === "undefined") { isReceiver = false; }
        this._encrypter.encryptMessage(this._predecessor.outgoingKey, isReceiver, buffer, function (err, encrypted) {
            if (!err && encrypted) {
                _this._connectionManager.pipeCircuitMessageTo(_this._predecessor, 'ENCRYPTED_DIGEST', encrypted);
            }
        });
    };

    /**
    * Kicks of a cell extension. This function gets called when a RELAY_CREATE_CELL request comes in.
    * Immediately sets the successor after generating a circuit Id, sends on the CREATE_CELL_ADDITIVE message as initiator,
    * and waits for a response (sets a timeout, of course).
    *
    * @method core.protocol.hydra.HydraCell~_extendCellWith
    *
    * @param {string} ip The ip of the node to extend the cell with.
    * @param {number} port The port of the node to extend the cell with.
    * @param {string} uuid The UUID of the additive sharing scheme used.
    * @param {Buffer} additivePayload The payload of the additive share.
    */
    HydraCell.prototype._extendCellWith = function (ip, port, uuid, additivePayload) {
        var _this = this;
        var circuitId = crypto.pseudoRandomBytes(16).toString('hex');

        this._currentExtensionUuid = uuid;

        this._successor = {
            ip: ip,
            port: port,
            circuitId: circuitId
        };

        this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(this._successor, circuitId, uuid, additivePayload);

        // set the timeout
        this._currentExtensionTimeout = global.setTimeout(function () {
            _this._currentExtensionTimeout = 0;
            _this._teardown(true, true);
        }, this._extensionReactionInMs);

        this._extensionResponseListener = function (from, msg) {
            _this._clearExtensionTimeout();
            _this._onExtensionResponse(from, msg);
        };

        this._messageCenter.on('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
    };

    /**
    * Initiates an ENCRYPTED_DIGEST message with a given readable, already unwrapped message.
    * This is used for CELL_CREATED_REJECTED messages for example, as the client needs to send on the message but
    * also needs knowledge of the content.
    *
    * @method core.protocol.hydra.HydraCell~_initiateDigestWithReadableMessage
    *
    * @param {string} messageType The human readable representation of the readable message's message type.
    * @param {any} msg Any readable message.
    */
    HydraCell.prototype._initiateDigestWithReadableMessage = function (messageType, msg) {
        var payload = this._messageCenter.getFullBufferOfMessage(messageType, msg);

        if (payload) {
            this._digestBuffer(payload, true);
        }
    };

    /**
    * Functions that gets called when a circuit socket is terminated. Checks if the terminated circuit is assigned
    * to the successor/predecessor of this is cell, and if yes, tears it down.
    *
    * @method core.protocol.hydra.HydraCell~_onCircuitTermination
    *
    * @param {string} terminatedCircuitId The circuitId assigned to the terminated socket.
    */
    HydraCell.prototype._onCircuitTermination = function (terminatedCircuitId) {
        if (this._predecessor.circuitId === terminatedCircuitId) {
            this._teardown(false, true);
        } else if (this._successor && this._successor.circuitId === terminatedCircuitId) {
            this._teardown(true, false);
        }
    };

    /**
    * Function that gets called as soon as a response to a cell extension request rolls in.
    * Clears everything up. If anything goes wrong, tears down the circuit.
    *
    * Removes the successor from the cell and the circuit nodes of the connection manager on rejection, thus being
    * able to extend the cell again later.
    * If the request was accepted, the ENCRYPTED_DIGEST listener on the now shared circuit ID is bound.
    *
    * Either way, the message is passed on through the digestion track.
    *
    * @method core.protocol.hydra.HydraCell~_onExtensionResponse
    *
    * @param {core.protocol.hydra.HydraNode} from The node the response originates from.
    * @param {core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface} msg The received response.
    */
    HydraCell.prototype._onExtensionResponse = function (from, msg) {
        if (from === this._successor) {
            this._removeExtensionResponseListener();

            if (msg.getUUID() === this._currentExtensionUuid) {
                if (msg.isRejected()) {
                    var succ = this._successor;
                    this._successor = null;
                    this._connectionManager.removeFromCircuitNodes(succ);
                } else {
                    this._setupDigestListener();
                }

                this._initiateDigestWithReadableMessage('CELL_CREATED_REJECTED', msg);
            } else {
                this._teardown(true, true);
            }
        }
    };

    /**
    * Function that gets called when the cell receives a ENCRYPTED_SPITOUT message.
    * The message is decrypted and checked if one is the intended receiver for the message. If yes, it is handled accordingly.
    * If not, the decrypted message is passed on to the successor (if there is one).
    * If one is not the intended receiver and there is no successor, something must have gone wrong and the cell is torn down.
    *
    * @method core.protocol.hydra.HydraCell~_onSpitoutMessage
    *
    * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The ENCRYPTED_SPITOUT message with the encrypted payload.
    */
    HydraCell.prototype._onSpitoutMessage = function (message) {
        var decryptedMessage = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

        if (decryptedMessage.isReceiver()) {
            this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
        } else if (this._successor && this._successor.socketIdentifier) {
            this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', message.getPayload());
        } else {
            this._teardown(true, true);
        }
    };

    /**
    * Removes the listener on the CELL_CREATED_REJECTED messages.
    * This is called on either tearing down the cell or when a response the the extension request has rolled in from the intended node.
    *
    * @method core.protocol.hydra.HydraCell~_removeExtensionResponseListener
    */
    HydraCell.prototype._removeExtensionResponseListener = function () {
        if (this._extensionResponseListener && this._successor) {
            this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
            this._extensionResponseListener = null;
        }
    };

    /**
    * Cleans up all listeners flying around.
    * This is only called on teardown.
    *
    * @method core.protocol.hydra.HydraCell~_removeListeners
    */
    HydraCell.prototype._removeListeners = function () {
        this._connectionManager.removeListener('circuitTermination', this._terminationListener);

        this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);

        this._spitoutListener = null;
        this._extensionListener = null;

        if (this._digestListener) {
            this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
            this._digestListener = null;
        }

        this._removeExtensionResponseListener();
    };

    /**
    * Sets up the ENCRYPTED_DIGEST listener on the successor node. Basically it is just further encrypting the
    * received content and passing it on the digestion track.
    *
    * @method core.protocol.hydra.HydraCell~_setupDigestListener
    */
    HydraCell.prototype._setupDigestListener = function () {
        var _this = this;
        this._digestListener = function (from, msg) {
            if (from === _this._successor) {
                _this._digestBuffer(msg.getPayload());
            }
        };

        this._messageCenter.on('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
    };

    /**
    * The basic listener setup on creation of the cell.
    *
    * @method core.protocol.hydra.HydraCell~_setupListeners
    */
    HydraCell.prototype._setupListeners = function () {
        var _this = this;
        this._terminationListener = function (terminatedCircuitId) {
            _this._onCircuitTermination(terminatedCircuitId);
        };

        this._spitoutListener = function (from, msg) {
            if (from === _this._predecessor) {
                _this._onSpitoutMessage(msg);
            }
        };

        this._extensionListener = function (from, msg, decrypted) {
            if (from === _this._predecessor) {
                var createCellMsg = _this._messageCenter.unwrapAdditiveSharingPayload(msg);

                if (createCellMsg && decrypted && !_this._successor) {
                    _this._extendCellWith(msg.getIp(), msg.getPort(), createCellMsg.getUUID(), createCellMsg.getAdditivePayload());
                } else {
                    _this._teardown(true, true);
                }
            }
        };

        this._connectionManager.on('circuitTermination', this._terminationListener);
        this._messageCenter.on('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.on('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
    };

    /**
    * Tears down the circuit. Cleans up everything and emits the 'isTornDown' event.
    *
    * @method core.protocol.hydra.HydraCell~_teardown
    *
    * @param {boolean} killPredecessor Indicates if the socket assigned to the predecessor should be removed.
    * @param {boolean} killSuccessor Indicates if the socket assigned to the successor should be removed (if there is one)
    */
    HydraCell.prototype._teardown = function (killPredecessor, killSuccessor) {
        if (!this._isTornDown) {
            this._isTornDown = true;

            this._removeListeners();
            this._clearExtensionTimeout();

            if (killPredecessor) {
                this._connectionManager.removeFromCircuitNodes(this._predecessor);
            }
            if (killSuccessor && this._successor) {
                this._connectionManager.removeFromCircuitNodes(this._successor);
            }

            this.emit('isTornDown');
        }
    };
    return HydraCell;
})(events.EventEmitter);

module.exports = HydraCell;
//# sourceMappingURL=HydraCell.js.map
