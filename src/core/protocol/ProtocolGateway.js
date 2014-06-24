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

// HYDRA
var HydraMessageCenter = require('./hydra/HydraMessageCenter');

var CircuitManager = require('./hydra/CircuitManager');

var CellManager = require('./hydra/CellManager');

var ConnectionManager = require('./hydra/ConnectionManager');

var CircuitExtenderFactory = require('./hydra/CircuitExtenderFactory');
var HydraCircuitFactory = require('./hydra/HydraCircuitFactory');
var HydraCellFactory = require('./hydra/HydraCellFactory');

// Message factories
var ReadableHydraMessageFactory = require('./hydra/messages/ReadableHydraMessageFactory');
var WritableHydraMessageFactory = require('./hydra/messages/WritableHydraMessageFactory');
var ReadableCellCreatedRejectedMessageFactory = require('./hydra/messages/ReadableCellCreatedRejectedMessageFactory');
var WritableCellCreatedRejectedMessageFactory = require('./hydra/messages/WritableCellCreatedRejectedMessageFactory');
var ReadableAdditiveSharingMessageFactory = require('./hydra/messages/ReadableAdditiveSharingMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('./hydra/messages/ReadableCreateCellAdditiveMessageFactory');
var WritableCreateCellAdditiveMessageFactory = require('./hydra/messages/WritableCreateCellAdditiveMessageFactory');
var WritableAdditiveSharingMessageFactory = require('./hydra/messages/WritableAdditiveSharingMessageFactory');
var Aes128GcmLayeredEncDecHandlerFactory = require('./hydra/messages/Aes128GcmLayeredEncDecHandlerFactory');
var Aes128GcmWritableMessageFactory = require('./hydra/messages/Aes128GcmWritableMessageFactory');
var Aes128GcmReadableDecryptedMessageFactory = require('./hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

var logger = require('../utils/logger/LoggerFactory').create();

var ProtocolGateway = (function () {
    function ProtocolGateway(appConfig, protocolConfig, topologyConfig, hydraConfig, myNode, tcpSocketHandler, routingTable) {
        var _this = this;
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._appConfig = null;
        this._hydraConfig = null;
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
        this._hydraMessageCenter = null;
        this._hydraConnectionManager = null;
        this._hydraCircuitManager = null;
        this._hydraCellManager = null;
        this._appConfig = appConfig;
        this._protocolConfig = protocolConfig;
        this._topologyConfig = topologyConfig;
        this._hydraConfig = hydraConfig;

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

        this._nodeSeekerManager = new NodeSeekerManager(this._protocolConfig, this._myNode, nodeSeekerFactory, this._protocolConnectionManager, this._proxyManager);

        // build up the NodePublishers
        var nodePublisherFactory = new NodePublisherFactory(appConfig, protocolConfig, this._myNode);

        nodePublisherFactory.createPublisherList(function (list) {
            _this._nodePublishers = list;
        });

        // build up the NetworkMaintainer
        this._networkMaintainer = new NetworkMaintainer(this._topologyConfig, this._protocolConfig, this._myNode, this._nodeSeekerManager, this._findClosestNodesManager, this._proxyManager);

        // HYDRA THINGS
        var readableHydraMessageFactory = new ReadableHydraMessageFactory();
        var writableHydraMessageFactory = new WritableHydraMessageFactory();
        var readableCellCreatedRejectedMessageFactory = new ReadableCellCreatedRejectedMessageFactory();
        var writableCellCreatedRejectedMessageFactory = new WritableCellCreatedRejectedMessageFactory();
        var readableAdditiveSharingMessageFactory = new ReadableAdditiveSharingMessageFactory();
        var readableCreateCellAdditiveMessageFactory = new ReadableCreateCellAdditiveMessageFactory();
        var writableCreateCellAdditiveMessageFactory = new WritableCreateCellAdditiveMessageFactory();
        var writableAdditiveSharingMessageFactory = new WritableAdditiveSharingMessageFactory();

        this._hydraConnectionManager = new ConnectionManager(this._protocolConnectionManager, writableHydraMessageFactory, readableHydraMessageFactory);
        this._hydraMessageCenter = new HydraMessageCenter(this._hydraConnectionManager, readableHydraMessageFactory, readableCellCreatedRejectedMessageFactory, readableAdditiveSharingMessageFactory, readableCreateCellAdditiveMessageFactory, writableCreateCellAdditiveMessageFactory, writableAdditiveSharingMessageFactory, writableHydraMessageFactory, writableCellCreatedRejectedMessageFactory);

        var circuitExtenderFactory = new CircuitExtenderFactory(this._hydraConnectionManager, this._hydraMessageCenter);
        var aes128GcmLayeredEncDecHandlerFactory = new Aes128GcmLayeredEncDecHandlerFactory();
        var aes128GcmDecryptionFactory = new Aes128GcmReadableDecryptedMessageFactory();
        var aes128GcmEncryptionFactory = new Aes128GcmWritableMessageFactory();
        var hydraCircuitFactory = new HydraCircuitFactory(this._hydraConfig, this._routingTable, this._hydraConnectionManager, this._hydraMessageCenter, circuitExtenderFactory, aes128GcmLayeredEncDecHandlerFactory);
        var hydraCellFactory = new HydraCellFactory(this._hydraConfig, this._hydraConnectionManager, this._hydraMessageCenter, aes128GcmDecryptionFactory, aes128GcmEncryptionFactory);

        this._hydraCircuitManager = new CircuitManager(this._hydraConfig, hydraCircuitFactory);
        this._hydraCellManager = new CellManager(this._hydraConfig, this._hydraConnectionManager, this._hydraMessageCenter, hydraCellFactory);
    }
    ProtocolGateway.prototype.start = function () {
        /**
        *
        * If it needs a proxy, kick off proxy manager only when the NetworkMaintainer has finished its entry
        * If it doesnt need a proxy, kick off proxy manager right away
        *
        */
        var _this = this;
        logger.info('New node joining the network', { id: this._myNode.getId().toHexString() });

        if (this._proxyManager.needsAdditionalProxy()) {
            this._networkMaintainer.once('initialContactQueryCompleted', function () {
                _this._proxyManager.kickOff();
            });
        } else {
            this._proxyManager.kickOff();
        }

        this._networkMaintainer.once('initialContactQueryCompleted', function () {
            logger.info('Initial contact query completed. Kicking off proxy manager...', { id: _this._myNode.getId().toHexString() });
        });

        this._networkMaintainer.once('joinedNetwork', function () {
            logger.info('Successfully joined the network.', { id: _this._myNode.getId().toHexString() });

            // start the hydra things
            _this._hydraCircuitManager.kickOff();

            _this._hydraCircuitManager.once('desiredCircuitAmountReached', function () {
                logger.info('Hydra circuit construction done.', { id: _this._myNode.getId().toHexString() });
            });
        });

        this._networkMaintainer.joinNetwork();
    };
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
