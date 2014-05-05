var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* @class core.protocol.ProtocolConnectionManager
*
* @extends events.EventEmitter
* @implements core.protocol.ProtocolConnectionManagerInterface
*
*/
var ProtocolConnectionManager = (function (_super) {
    __extends(ProtocolConnectionManager, _super);
    function ProtocolConnectionManager(tcpSocketHandler, readableMessageFactory) {
        _super.call(this);
        this._tcpSocketHandler = null;
        this._readableMessageFactory = null;

        this._tcpSocketHandler = tcpSocketHandler;
        this._readableMessageFactory = readableMessageFactory;
    }
    return ProtocolConnectionManager;
})(events.EventEmitter);

module.exports = ProtocolConnectionManager;
//# sourceMappingURL=ProtocolConnectionManager.js.map
