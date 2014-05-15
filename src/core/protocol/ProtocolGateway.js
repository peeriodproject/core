var ProtocolConnectionManager = require('./net/ProtocolConnectionManager');

var ProxyManager = require('./proxy/ProxyManager');

var ProtocolGateway = (function () {
    function ProtocolGateway(protocolConfig, myNode, tcpSocketHandler, routingTable) {
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._protocolConfig = null;
        this._protocolConnectionManager = null;
        this._proxyManager = null;
        this._routingTable = null;
        this._protocolConfig = protocolConfig;
        this._myNode = myNode;
        this._tcpSocketHandler = tcpSocketHandler;
        this._routingTable = routingTable;

        // build up the ProtocolConnectionManager
        this._protocolConnectionManager = new ProtocolConnectionManager(this._protocolConfig, this._myNode, this._tcpSocketHandler);

        // build up zhr ProxyManager
        this._proxyManager = new ProxyManager(this._protocolConfig, this._protocolConnectionManager, this._routingTable);
    }
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
