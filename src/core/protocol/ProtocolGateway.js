var ProtocolConnectionManager = require('./net/ProtocolConnectionManager');

var ProxyManager = require('./proxy/ProxyManager');
var PingPongNodeUpdateHandler = require('./ping/PingPongNodeUpdateHandler');

var FindClosestNodesManager = require('./findClosestNodes/FindClosestNodesManager');
var FindClosestNodesCycleFactory = require('./findClosestNodes/FindClosestNodesCycleFactory');
var FoundClosestNodesWritableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
var FoundClosestNodesReadableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');

var ProtocolGateway = (function () {
    function ProtocolGateway(protocolConfig, topologyConfig, myNode, tcpSocketHandler, routingTable) {
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._protocolConfig = null;
        this._protocolConnectionManager = null;
        this._proxyManager = null;
        this._routingTable = null;
        this._topologyConfig = null;
        this._pingPongNodeUpdateHandler = null;
        this._findClosestNodesManager = null;
        this._protocolConfig = protocolConfig;
        this._topologyConfig = topologyConfig;

        this._myNode = myNode;
        this._tcpSocketHandler = tcpSocketHandler;
        this._routingTable = routingTable;

        // build up the ProtocolConnectionManager
        this._protocolConnectionManager = new ProtocolConnectionManager(this._protocolConfig, this._myNode, this._tcpSocketHandler);

        // build up the ProxyManager
        this._proxyManager = new ProxyManager(this._protocolConfig, this._protocolConnectionManager, this._routingTable);

        // build up the PingPongNodeUpdateHandler
        this._pingPongNodeUpdateHandler = new PingPongNodeUpdateHandler(this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable);

        // build up the FindClosestNodeManager
        var findClosestNodesCycleFactory = new FindClosestNodesCycleFactory(this._myNode, this._protocolConnectionManager);
        var foundClosestNodesWritableMessageFactory = new FoundClosestNodesWritableMessageFactory();
        var foundClosestNodesReadableMessageFactory = new FoundClosestNodesReadableMessageFactory();

        this._findClosestNodesManager = new FindClosestNodesManager(this._topologyConfig, this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable, findClosestNodesCycleFactory, foundClosestNodesWritableMessageFactory, foundClosestNodesReadableMessageFactory);
    }
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
