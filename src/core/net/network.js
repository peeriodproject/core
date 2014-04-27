/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var NetworkManager = (function (_super) {
    __extends(NetworkManager, _super);
    function NetworkManager(opts) {
        _super.call(this);
        // @todo check if the ports are really open, maybe a PortChecker class?
        // @todo create a TCPHandler
        // @todo we also need some class to obtain the external ip
    }
    return NetworkManager;
})(events.EventEmitter);
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=network.js.map
