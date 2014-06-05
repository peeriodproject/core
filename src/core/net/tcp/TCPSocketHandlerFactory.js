var TCPSocketHandler = require('./TCPSocketHandler');

/**
* @class core.net.tcp.TCPSocketHandlerFactory
* @implements core.net.tcp.TCPSocketHandlerFactoryInterfacer
*/
var TCPSocketHandlerFactory = (function () {
    function TCPSocketHandlerFactory() {
    }
    TCPSocketHandlerFactory.prototype.create = function (socketFactory, options) {
        return new TCPSocketHandler(socketFactory, options);
    };
    return TCPSocketHandlerFactory;
})();

module.exports = TCPSocketHandlerFactory;
//# sourceMappingURL=TCPSocketHandlerFactory.js.map
