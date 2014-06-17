var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraMessageCenter = (function (_super) {
    __extends(HydraMessageCenter, _super);
    function HydraMessageCenter(connectionManager, readableCellCreatedRejectedFactory, readableAdditiveSharingFactory, readableCreateCellAdditiveFactory) {
        _super.call(this);
        this._connectionManager = null;
        this._readableCellCreatedRejectedFactory = null;
        this._readableAdditiveSharingFactory = null;
        this._readableCreateCellAdditiveFactory = null;

        this._connectionManager = connectionManager;
        this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
        this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
        this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;

        this._setupListeners();
    }
    HydraMessageCenter.prototype._emitMessage = function (message, ip, msgFactory, eventAppendix) {
        var msg = null;

        try  {
            msg = msgFactory.create(message.getPayload());
        } catch (e) {
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
