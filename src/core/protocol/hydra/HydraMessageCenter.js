var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraMessageCenter = (function (_super) {
    __extends(HydraMessageCenter, _super);
    function HydraMessageCenter(connectionManager) {
        _super.call(this);
        this._connectionManager = null;

        this._connectionManager = connectionManager;

        this._setupListeners();
    }
    HydraMessageCenter.prototype._onMessage = function (ip, message) {
        var circuitId = message.getCircuitId();

        if (circuitId) {
            this.emit(circuitId, ip, message);
        } else {
            if (message.getMessageType() === 'ADDITIVE_SHARING') {
                this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', message.getPayload(), { ip: ip });
            } else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                this.emit('createCellAdditiveMessage', message);
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
