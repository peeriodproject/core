var TCPSocketHandler = require('./TCPSocketHandler');

var TCPSocketHandlerFactory = (function () {
    function TCPSocketHandlerFactory() {
    }
    TCPSocketHandlerFactory.prototype.create = function (socketFactory, opts) {
        return new TCPSocketHandler(socketFactory, opts);
    };
    return TCPSocketHandlerFactory;
})();

module.exports = TCPSocketHandlerFactory;
//# sourceMappingURL=TCPSocketHandlerFactory.js.map
