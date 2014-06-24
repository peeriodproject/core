var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* HydraMessageCenterInterface implementation
*
* Takes a lot of message factories.
*
* @class core.protocol.hydra.HydraMessageCenter
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.HydraMessageCenterInterface
*
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
* @param {core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface} readableCellCreatedRejectedFactory
* @param {core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface} readableAdditiveSharingFactory
* @param {core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface} readableCreateCellAdditiveFactory
* @param {core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface} writableCreateCellAdditiveFactory
* @param {core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface} writableAdditiveSharingFactory
* @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableHydraMessageFactory
*/
var HydraMessageCenter = (function (_super) {
    __extends(HydraMessageCenter, _super);
    function HydraMessageCenter(connectionManager, readableHydraMessageFactory, readableCellCreatedRejectedFactory, readableAdditiveSharingFactory, readableCreateCellAdditiveFactory, writableCreateCellAdditiveFactory, writableAdditiveSharingFactory, writableHydraMessageFactory, writableCellCreatedRejectedFactory) {
        _super.call(this);
        /**
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraMessageCenterInterface~_connectionManager
        */
        this._connectionManager = null;
        /**
        * @member {core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableAdditiveSharingFactory
        */
        this._readableAdditiveSharingFactory = null;
        /**
        * @member {core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableCellCreatedRejectedFactory
        */
        this._readableCellCreatedRejectedFactory = null;
        /**
        * @member {core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableCreateCellAdditiveFactory
        */
        this._readableCreateCellAdditiveFactory = null;
        /**
        * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableHydraMessageFactory
        */
        this._readableHydraMessageFactory = null;
        /**
        * @member {core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableAdditiveSharingFactory
        */
        this._writableAdditiveSharingFactory = null;
        /**
        * @member {core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_WritableCreateCellAdditiveFactory
        */
        this._writableCreateCellAdditiveFactory = null;
        /**
        * @member {core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableCellCreatedRejectedFactory
        */
        this._writableCellCreatedRejectedFactory = null;
        /**
        * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableHydraMessageFactory
        */
        this._writableHydraMessageFactory = null;

        this._connectionManager = connectionManager;
        this._readableHydraMessageFactory = readableHydraMessageFactory;
        this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
        this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
        this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;
        this._writableCreateCellAdditiveFactory = writableCreateCellAdditiveFactory;
        this._writableAdditiveSharingFactory = writableAdditiveSharingFactory;
        this._writableHydraMessageFactory = writableHydraMessageFactory;
        this._writableCellCreatedRejectedFactory = writableCellCreatedRejectedFactory;

        this._setupListeners();
    }
    HydraMessageCenter.prototype.forceCircuitMessageThrough = function (payload, from) {
        var msg = null;

        try  {
            msg = this._readableHydraMessageFactory.create(payload, true);
        } catch (e) {
        }

        if (msg) {
            this._onCircuitMessage(msg, from, true);
        }
    };

    HydraMessageCenter.prototype.getFullBufferOfMessage = function (type, msg) {
        var buffer = null;
        var middleMessage = null;

        try  {
            if (type === 'CELL_CREATED_REJECTED') {
                middleMessage = this._writableCellCreatedRejectedFactory.constructMessage(msg.getUUID(), msg.getSecretHash(), msg.getDHPayload());
            }

            buffer = this._writableHydraMessageFactory.constructMessage(type, middleMessage);
        } catch (e) {
        }

        return buffer;
    };

    HydraMessageCenter.prototype.sendAdditiveSharingMessage = function (to, targetIp, targetPort, uuid, additivePayload) {
        var msg = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

        if (msg) {
            this._connectionManager.pipeMessageTo(to, 'ADDITIVE_SHARING', msg);
        }
    };

    HydraMessageCenter.prototype.sendCreateCellAdditiveMessageAsInitiator = function (to, circuitId, uuid, additivePayload) {
        var msg = null;

        try  {
            msg = this._writableCreateCellAdditiveFactory.constructMessage(true, uuid, additivePayload, circuitId);
        } catch (e) {
        }

        if (msg) {
            this._connectionManager.pipeCircuitMessageTo(to, 'CREATE_CELL_ADDITIVE', msg, true);
        }
    };

    HydraMessageCenter.prototype.sendCellCreatedRejectedMessage = function (to, uuid, secretHash, dhPayload) {
        var msg = null;

        try  {
            msg = this._writableCellCreatedRejectedFactory.constructMessage(uuid, secretHash, dhPayload);
        } catch (e) {
        }

        if (msg) {
            this._connectionManager.pipeCircuitMessageTo(to, 'CELL_CREATED_REJECTED', msg);
        }
    };

    HydraMessageCenter.prototype.spitoutRelayCreateCellMessage = function (encDecHandler, targetIp, targetPort, uuid, additivePayload) {
        var _this = this;
        var payload = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

        if (payload) {
            var msg = this._writableHydraMessageFactory.constructMessage('ADDITIVE_SHARING', payload, payload.length);

            encDecHandler.encrypt(msg, null, function (err, encMessage) {
                var nodes = encDecHandler.getNodes();

                if (!err && encMessage) {
                    _this._connectionManager.pipeCircuitMessageTo(nodes[0], 'ENCRYPTED_SPITOUT', encMessage);
                }
            });
        }
    };

    HydraMessageCenter.prototype.unwrapAdditiveSharingPayload = function (message) {
        var msg = null;

        try  {
            msg = this._readableCreateCellAdditiveFactory.create(message.getPayload());
        } catch (e) {
        }

        return msg;
    };

    /**
    * Lets a provided factory read the payload of the message and emits this message.
    * The name of the event is the human readably message type, appended with an eventAppend (e.g. a circuit id), if provided.
    *
    * @method core.protocol.hydra.HydraMessageCenter~_emitMessage
    *
    * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to 'unwrap' and emit.
    * @param {any} nodeOrIdentifier The originating hydra node or the socket identifier the message came through.
    * @param {any} msgFactory Optional. Expects any readable message factory. If this is provided, the payload of the message is unwrapped by the message factory.
    * @param {string} eventAppendix Optional. A string which gets appended to the event name, if present.
    * @param {boolean} decrypted Optional. Indicates whether this message is the decryption of an encrypted message.
    */
    HydraMessageCenter.prototype._emitMessage = function (message, nodeOrIdentifier, msgFactory, eventAppendix, decrypted) {
        var msg = null;

        if (msgFactory) {
            try  {
                msg = msgFactory.create(message.getPayload());
            } catch (e) {
                throw e;
            }
        } else {
            msg = message;
        }

        if (msg) {
            this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), nodeOrIdentifier, msg, decrypted);
        }
    };

    /**
    * Creates a CREATE_CELL_ADDITIVE message and wraps it in an ADDITIVE_SHARING message and returns the payload.
    *
    * @method core.protocol.hydra.HydraConnectionManager~_getAdditiveSharingMessagePayload
    *
    * @param {string} targetIp The IP address the receiver node should relay the payload to.
    * @param {number} targetPort The port the receiver node should relay the payload to.
    * @param {string} uuid The UUID of the additive sharing scheme.
    * @param {Buffer} additivePayload The additive payload.
    * @returns {Buffer} The CREATE_CELL_ADDITIVE payload
    */
    HydraMessageCenter.prototype._getAdditiveSharingMessagePayload = function (targetIp, targetPort, uuid, additivePayload) {
        var msg = null;

        try  {
            var createCellBuf = this._writableCreateCellAdditiveFactory.constructMessage(false, uuid, additivePayload);
            msg = this._writableAdditiveSharingFactory.constructMessage(targetIp, targetPort, createCellBuf, createCellBuf.length);
        } catch (e) {
        }

        return msg;
    };

    /**
    * Handler for 'circuit' messages, i.e. message which originated from a socket which is assigned to a specific circuit node.
    *
    * @method core.protocol.hydra.HydraMessageCenter~_onCircuitMessage
    *
    * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to handle.
    * @param {core.protocol.hydra.HydraNode} circuitNode The node this message originates from.
    * @param {boolean} decrypted Optional. Indicates whether this message is the decryption of an encrypted message.
    */
    HydraMessageCenter.prototype._onCircuitMessage = function (message, circuitNode, decrypted) {
        var circuitId = circuitNode.circuitId;

        if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
            this._emitMessage(message, circuitNode, this._readableCellCreatedRejectedFactory, circuitId, decrypted);
        } else if (message.getMessageType() === 'ADDITIVE_SHARING') {
            this._emitMessage(message, circuitNode, this._readableAdditiveSharingFactory, circuitId, decrypted);
        } else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
            this._emitMessage(message, circuitNode, null, circuitId, decrypted);
        }
    };

    /**
    * Handler for 'regular' hydra messages, i.e. messages from sockets which are not assigned to a specific circuit node.
    *
    * @method core.protocol.hydra.HydraMessageCenter~_onMessage
    *
    * @param {string} identifier The identifier of the socket this message came through. (can the be used for future work)
    * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to handle.
    */
    HydraMessageCenter.prototype._onMessage = function (identifier, message) {
        if (message.getMessageType() === 'ADDITIVE_SHARING') {
            var msg = null;

            try  {
                msg = this._readableAdditiveSharingFactory.create(message.getPayload());
            } catch (e) {
            }

            if (msg) {
                this._connectionManager.pipeMessageTo({ ip: msg.getIp(), port: msg.getPort() }, 'CREATE_CELL_ADDITIVE', msg.getPayload());
            }
        } else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
            this._emitMessage(message, identifier, this._readableCreateCellAdditiveFactory);
        }
    };

    /**
    * Sets uo the listeners on the connection manager.
    *
    * @method core.protocol.hydra.HydraMessageCenter~_setupListeners
    */
    HydraMessageCenter.prototype._setupListeners = function () {
        var _this = this;
        this._connectionManager.on('circuitMessage', function (msg, circuitNode) {
            _this._onCircuitMessage(msg, circuitNode);
        });

        this._connectionManager.on('message', function (msg, identifier) {
            _this._onMessage(identifier, msg);
        });
    };
    return HydraMessageCenter;
})(events.EventEmitter);

module.exports = HydraMessageCenter;
//# sourceMappingURL=HydraMessageCenter.js.map
