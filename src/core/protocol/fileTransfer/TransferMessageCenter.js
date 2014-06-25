var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var TransferMessageCenter = (function (_super) {
    __extends(TransferMessageCenter, _super);
    function TransferMessageCenter() {
        _super.apply(this, arguments);
    }
    return TransferMessageCenter;
})(events.EventEmitter);

module.exports = TransferMessageCenter;
//# sourceMappingURL=TransferMessageCenter.js.map
