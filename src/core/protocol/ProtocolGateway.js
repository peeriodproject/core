var ProtocolConnectionManager = require('./net/ProtocolConnectionManager');

var ProtocolGateway = (function () {
    function ProtocolGateway(protocolConfig, myNode, tcpSocketHandler) {
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._protocolConfig = null;
        this._protocolConnectionManager = null;
        this._protocolConfig = protocolConfig;
        this._myNode = myNode;
        this._tcpSocketHandler = tcpSocketHandler;

        // build up the ProtocolConnectionManager
        this._protocolConnectionManager = new ProtocolConnectionManager(this._protocolConfig, this._myNode, this._tcpSocketHandler);
    }
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
