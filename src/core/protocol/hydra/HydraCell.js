var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraCell = (function (_super) {
    __extends(HydraCell, _super);
    function HydraCell(predecessorNode, connectionManager, messageCenter) {
        _super.call(this);
        this._connectionManager = null;
        this._messageCenter = null;
        this._predecessor = null;

        this._predecessor = predecessorNode;

        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
    }
    return HydraCell;
})(events.EventEmitter);

module.exports = HydraCell;
//# sourceMappingURL=HydraCell.js.map
