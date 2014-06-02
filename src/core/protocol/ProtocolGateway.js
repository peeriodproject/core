var ProtocolConnectionManager = require('./net/ProtocolConnectionManager');

var ProxyManager = require('./proxy/ProxyManager');
var PingPongNodeUpdateHandler = require('./ping/PingPongNodeUpdateHandler');

var FindClosestNodesManager = require('./findClosestNodes/FindClosestNodesManager');
var FindClosestNodesCycleFactory = require('./findClosestNodes/FindClosestNodesCycleFactory');
var FoundClosestNodesWritableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
var FoundClosestNodesReadableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');

var NodeSeekerManager = require('./networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerManager');
var NodeSeekerFactory = require('./networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');

var NodePublisherFactory = require('./networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');

var NetworkMaintainer = require('./networkMaintenance/NetworkMaintainer');

var logger = require('../../utils/logger/LoggerFactory').create();

var ProtocolGateway = (function () {
    function ProtocolGateway(appConfig, protocolConfig, topologyConfig, myNode, tcpSocketHandler, routingTable) {
        var _this = this;
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._appConfig = null;
        this._protocolConfig = null;
        this._protocolConnectionManager = null;
        this._proxyManager = null;
        this._routingTable = null;
        this._topologyConfig = null;
        this._pingPongNodeUpdateHandler = null;
        this._findClosestNodesManager = null;
        this._nodeSeekerManager = null;
        this._nodePublishers = null;
        this._networkMaintainer = null;
        this._appConfig = appConfig;
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

        // build up the NodeSeekerManager
        var nodeSeekerFactory = new NodeSeekerFactory(this._appConfig, this._routingTable);

        this._nodeSeekerManager = new NodeSeekerManager(nodeSeekerFactory, this._protocolConnectionManager, this._proxyManager);

        // build up the NodePublishers
        var nodePublisherFactory = new NodePublisherFactory(appConfig, this._myNode);

        nodePublisherFactory.createPublisherList(function (list) {
            _this._nodePublishers = list;
        });

        // build up the NetworkMaintainer
        this._networkMaintainer = new NetworkMaintainer(this._topologyConfig, this._protocolConfig, this._myNode, this._nodeSeekerManager, this._findClosestNodesManager, this._proxyManager);
    }
    ProtocolGateway.prototype.start = function () {
        var _this = this;
        /**
        *
        * If it needs a proxy, kick off proxy manager only when the NetworkMaintainer has finished its entry
        * If it doesnt need a proxy, kick off proxy manager right away
        *
        */
        if (this._proxyManager.needsAdditionalProxy()) {
            this._networkMaintainer.once('initialContactQueryCompleted', function () {
                logger.info('Initial contact query completed. Kicking off proxy manager...');
                _this._proxyManager.kickOff();
            });
        } else {
            this._proxyManager.kickOff();
        }

        logger.info('Joining the network');

        this._networkMaintainer.once('joinedNetwork', function () {
            logger.info('Successfully joined the network.');
        });

        this._networkMaintainer.joinNetwork();
    };
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
