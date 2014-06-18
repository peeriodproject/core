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
            this._connectionManager.pipeMessage('ADDITIVE_SHARING', msg, to);
        }
    };

    HydraMessageCenter.prototype.sendCreateCellAdditiveMessageAsInitiator = function (to, circuitId, uuid, additivePayload) {
        var msg = null;

        try  {
            msg = this._writableCreateCellAdditiveFactory.constructMessage(true, uuid, additivePayload, circuitId);
        } catch (e) {
        }

        if (msg) {
            this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', msg, to);
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
                    _this._connectionManager.pipeMessage('ENCRYPTED_SPITOUT', encMessage, nodes[nodes.length - 1], circuitId);
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

    HydraMessageCenter.prototype._emitMessage = function (message, ip, msgFactory, eventAppendix) {
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
            this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), ip, msg);
        }
    };

    HydraMessageCenter.prototype._onMessage = function (ip, message) {
        var circuitId = message.getCircuitId();

        if (circuitId) {
            if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
                this._emitMessage(message, ip, this._readableCellCreatedRejectedFactory, circuitId);
            } else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
                this._emitMessage(message, ip, null, circuitId);
            }
        } else {
            if (message.getMessageType() === 'ADDITIVE_SHARING') {
                var msg = null;

                try  {
                    msg = this._readableAdditiveSharingFactory.create(message.getPayload());
                } catch (e) {
                }

                if (msg) {
                    this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', msg.getPayload(), { ip: msg.getIp(), port: msg.getPort() });
                }
            } else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                this._emitMessage(message, ip, this._readableCreateCellAdditiveFactory);
            }
        }
    };

    HydraMessageCenter.prototype._setupListeners = function () {
        var _this = this;
        this._connectionManager.on('hydraMessage', function (ip, msg) {
            _this._onMessage(ip, msg);
        });
    };
    return HydraMessageCenter;
})(events.EventEmitter);

module.exports = HydraMessageCenter;
//# sourceMappingURL=HydraMessageCenter.js.map
