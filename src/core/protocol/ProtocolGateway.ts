import ProtocolGatewayInterface = require('./interfaces/ProtocolGatewayInterface');
import ProtocolConnectionManagerInterface = require('./net/interfaces/ProtocolConnectionManagerInterface');
import ProtocolConnectionManager = require('./net/ProtocolConnectionManager');
import ProxyManagerInterface = require('./proxy/interfaces/ProxyManagerInterface');
import ProxyManager = require('./proxy/ProxyManager');
import PingPongNodeUpdateHandler = require('./ping/PingPongNodeUpdateHandler');
import TCPSocketHandlerInterface = require('../net/tcp/interfaces/TCPSocketHandlerInterface');
import MyNodeInterface = require('../topology/interfaces/MyNodeInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import RoutingTableInterface = require('../topology/interfaces/RoutingTableInterface');
import FindClosestNodesManager = require('./findClosestNodes/FindClosestNodesManager');
import FindClosestNodesCycleFactory = require('./findClosestNodes/FindClosestNodesCycleFactory');
import FoundClosestNodesWritableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
import FoundClosestNodesReadableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');
import NodeSeekerManagerInterface = require('./networkMaintenance/nodeDiscovery/nodeSeeker/interfaces/NodeSeekerManagerInterface');
import NodeSeekerManager = require('./networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerManager');
import NodeSeekerFactory = require('./networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');
import NodePublisherList = require('./networkMaintenance/nodeDiscovery/nodePublisher/interfaces/NodePublisherList');
import NodePublisherInterface = require('./networkMaintenance/nodeDiscovery/nodePublisher/interfaces/NodePublisherInterface');
import NodePublisherFactory = require('./networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');
import NetworkMaintainerInterface = require('./networkMaintenance/interfaces/NetworkMaintainerInterface');
import NetworkMaintainer = require('./networkMaintenance/NetworkMaintainer');

var logger = require('../utils/logger/LoggerFactory').create();

class ProtocolGateway implements ProtocolGatewayInterface {

	private _myNode:MyNodeInterface = null;
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;
	private _appConfig:ConfigInterface = null;
	private _protocolConfig:ConfigInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _topologyConfig:ConfigInterface = null;
	private _pingPongNodeUpdateHandler:PingPongNodeUpdateHandler = null;
	private _findClosestNodesManager:FindClosestNodesManager = null;
	private _nodeSeekerManager:NodeSeekerManagerInterface = null;
	private _nodePublishers:NodePublisherList = null;
	private _networkMaintainer:NetworkMaintainerInterface = null;

	constructor (appConfig:ConfigInterface, protocolConfig:ConfigInterface, topologyConfig:ConfigInterface, myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface, routingTable:RoutingTableInterface) {
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
		var findClosestNodesCycleFactory:FindClosestNodesCycleFactory = new FindClosestNodesCycleFactory(this._myNode, this._protocolConnectionManager);
		var foundClosestNodesWritableMessageFactory:FoundClosestNodesWritableMessageFactory = new FoundClosestNodesWritableMessageFactory();
		var foundClosestNodesReadableMessageFactory:FoundClosestNodesReadableMessageFactory = new FoundClosestNodesReadableMessageFactory();

		this._findClosestNodesManager = new FindClosestNodesManager(this._topologyConfig, this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable, findClosestNodesCycleFactory, foundClosestNodesWritableMessageFactory, foundClosestNodesReadableMessageFactory);

		// build up the NodeSeekerManager
		var nodeSeekerFactory:NodeSeekerFactory = new NodeSeekerFactory(this._appConfig, this._routingTable);

		this._nodeSeekerManager = new NodeSeekerManager(this._protocolConfig, this._myNode, nodeSeekerFactory, this._protocolConnectionManager, this._proxyManager);

		// build up the NodePublishers
		var nodePublisherFactory = new NodePublisherFactory(appConfig, protocolConfig, this._myNode);

		nodePublisherFactory.createPublisherList((list:NodePublisherList) => {
			this._nodePublishers = list;
		});

		// build up the NetworkMaintainer
		this._networkMaintainer = new NetworkMaintainer(this._topologyConfig, this._protocolConfig, this._myNode, this._nodeSeekerManager, this._findClosestNodesManager, this._proxyManager);

	}

	public start ():void {
		/**
		 *
		 * If it needs a proxy, kick off proxy manager only when the NetworkMaintainer has finished its entry
		 * If it doesnt need a proxy, kick off proxy manager right away
		 *
		 */

		logger.info('New node joining the network', {id: this._myNode.getId().toHexString()});

		if (this._proxyManager.needsAdditionalProxy()) {
			this._networkMaintainer.once('initialContactQueryCompleted', () => {
				logger.info('Initial contact query completed. Kicking off proxy manager...', {id: this._myNode.getId().toHexString()});
				this._proxyManager.kickOff();
			});
		}
		else {
			this._proxyManager.kickOff();
		}

		this._networkMaintainer.once('joinedNetwork', () => {
			logger.info('Successfully joined the network.', {id: this._myNode.getId().toHexString()});
		});

		this._networkMaintainer.joinNetwork();

	}


}

export = ProtocolGateway;