var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraCircuit = (function (_super) {
    __extends(HydraCircuit, _super);
    function HydraCircuit() {
        _super.apply(this, arguments);
    }
    return HydraCircuit;
})(events.EventEmitter);

module.exports = HydraCircuit;
//# sourceMappingURL=HydraCircuit.js.map
