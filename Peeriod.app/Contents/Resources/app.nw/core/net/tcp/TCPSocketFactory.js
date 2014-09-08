var TCPSocket = require('./TCPSocket');

/**
* @class core.net.tcp.TCPSocketFactory
* @implements core.net.tcp.TCPSocketFactoryInterface
*/
var TCPSocketFactory = (function () {
    function TCPSocketFactory() {
    }
    TCPSocketFactory.prototype.create = function (socket, opts) {
        return new TCPSocket(socket, opts);
    };
    return TCPSocketFactory;
})();

module.exports = TCPSocketFactory;
//# sourceMappingURL=TCPSocketFactory.js.map
