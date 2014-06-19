var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraMessageCenter = (function (_super) {
    __extends(HydraMessageCenter, _super);
    function HydraMessageCenter(connectionManager, readableCellCreatedRejectedFactory, readableAdditiveSharingFactory, readableCreateCellAdditiveFactory, writableCreateCellAdditiveFactory, writableAdditiveSharingFactory, writableHydraMessageFactory) {
        _super.call(this);
        this._connectionManager = null;
        this._readableCellCreatedRejectedFactory = null;
        this._readableAdditiveSharingFactory = null;
        this._readableCreateCellAdditiveFactory = null;
        this._writableCreateCellAdditiveFactory = null;
        this._writableAdditiveSharingFactory = null;
        this._writableHydraMessageFactory = null;

        this._connectionManager = connectionManager;
        this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
        this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
        this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;
        this._writableCreateCellAdditiveFactory = writableCreateCellAdditiveFactory;
        this._writableAdditiveSharingFactory = writableAdditiveSharingFactory;
        this._writableHydraMessageFactory = writableHydraMessageFactory;

        this._setupListeners();
    }
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

    HydraMessageCenter.prototype.spitoutRelayCreateCellMessage = function (encDecHandler, targetIp, targetPort, uuid, additivePayload, circuitId) {
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

    HydraMessageCenter.prototype._getAdditiveSharingMessagePayload = function (targetIp, targetPort, uuid, additivePayload) {
        var msg = null;

        try  {
            var createCellBuf = this._writableCreateCellAdditiveFactory.constructMessage(false, uuid, additivePayload);
            msg = this._writableAdditiveSharingFactory.constructMessage(targetIp, targetPort, createCellBuf, createCellBuf.length);
        } catch (e) {
        }

        return msg;
    };

    HydraMessageCenter.prototype._emitMessage = function (message, node, msgFactory, eventAppendix) {
        var msg = null;

        if (msgFactory) {
            try  {
                msg = msgFactory.create(message.getPayload());
            } catch (e) {
            }
        } else {
            msg = message;
        }

        if (msg) {
            this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), node, msg);
        }
    };

    HydraMessageCenter.prototype._onCircuitMessage = function (message, circuitNode) {
        var circuitId = circuitNode.circuitId;

        if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
            this._emitMessage(message, circuitNode, this._readableCellCreatedRejectedFactory, circuitId);
        } else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
            this._emitMessage(message, circuitNode, null, circuitId);
        }
    };

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
            // IF INITIATOR, KEEP THE SOCKET OPEN!
            this._emitMessage(message, identifier, this._readableCreateCellAdditiveFactory);
        }
    };

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
