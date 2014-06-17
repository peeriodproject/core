var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraCircuit = (function (_super) {
    __extends(HydraCircuit, _super);
    function HydraCircuit(hydraConfig, numOfRelayNodes, nodePicker, messageCenter, connectionManager, layeredEncDecFactory) {
        _super.call(this);
        this._numOfRelayNodes = 0;
        this._additiveSharingNodeAmount = 0;
        this._nodePicker = null;
        this._messageCenter = null;
        this._connectionManager = null;
        this._extensionReactionTimeBaseInMs = 0;
        this._extensionReactionTimeFactor = 0;
        this._layeredEncDecFactory = null;
        this._numOfRelayNodes = numOfRelayNodes;
        this._additiveSharingNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
        this._nodePicker = nodePicker;
        this._messageCenter = messageCenter;
        this._connectionManager = connectionManager;
        this._extensionReactionTimeFactor = hydraConfig.get('hydra.circuit.extensionReactionTimeFactor');
        this._extensionReactionTimeBaseInMs = hydraConfig.get('hydra.circuit.extensionReactionTimeBaseInSeconds') * 1000;
        this._layeredEncDecFactory = layeredEncDecFactory;
    }
    return HydraCircuit;
})(events.EventEmitter);

module.exports = HydraCircuit;
//# sourceMappingURL=HydraCircuit.js.map
