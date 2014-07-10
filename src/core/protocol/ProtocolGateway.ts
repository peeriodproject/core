import events = require('events');

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

// HYDRA
import HydraMessageCenter = require('./hydra/HydraMessageCenter');
import HydraMessageCenterInterface = require('./hydra/interfaces/HydraMessageCenterInterface');
import CircuitManager = require('./hydra/CircuitManager');
import CircuitManagerInterface = require('./hydra/interfaces/CircuitManagerInterface');
import CellManager = require('./hydra/CellManager');
import CellManagerInterface = require('./hydra/interfaces/CellManagerInterface');
import ConnectionManager = require('./hydra/ConnectionManager');
import ConnectionManagerInterface = require('./hydra/interfaces/ConnectionManagerInterface');
import CircuitExtenderFactory = require('./hydra/CircuitExtenderFactory');
import HydraCircuitFactory = require('./hydra/HydraCircuitFactory');
import HydraCellFactory = require('./hydra/HydraCellFactory');
// Message factories
import ReadableHydraMessageFactory = require('./hydra/messages/ReadableHydraMessageFactory');
import WritableHydraMessageFactory = require('./hydra/messages/WritableHydraMessageFactory');
import ReadableCellCreatedRejectedMessageFactory = require('./hydra/messages/ReadableCellCreatedRejectedMessageFactory');
import WritableCellCreatedRejectedMessageFactory = require('./hydra/messages/WritableCellCreatedRejectedMessageFactory');
import ReadableAdditiveSharingMessageFactory = require('./hydra/messages/ReadableAdditiveSharingMessageFactory');
import ReadableCreateCellAdditiveMessageFactory = require('./hydra/messages/ReadableCreateCellAdditiveMessageFactory');
import WritableCreateCellAdditiveMessageFactory = require('./hydra/messages/WritableCreateCellAdditiveMessageFactory');
import WritableAdditiveSharingMessageFactory = require('./hydra/messages/WritableAdditiveSharingMessageFactory');
import Aes128GcmLayeredEncDecHandlerFactory = require('./hydra/messages/Aes128GcmLayeredEncDecHandlerFactory');
import Aes128GcmWritableMessageFactory = require('./hydra/messages/Aes128GcmWritableMessageFactory');
import Aes128GcmReadableDecryptedMessageFactory = require('./hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

// FILE TRANSFER
import Middleware = require('./fileTransfer/Middleware');
import MiddlewareInterface = require('./fileTransfer/interfaces/MiddlewareInterface');
import BroadcastManagerInterface = require('./broadcast/interfaces/BroadcastManagerInterface');
import BroadcastManager = require('./broadcast/BroadcastManager');
import TransferMessageCenterInterface = require('./fileTransfer/interfaces/TransferMessageCenterInterface');
import TransferMessageCenter = require('./fileTransfer/TransferMessageCenter');
import BroadcastReadableMessageFactory = require('./broadcast/messages/BroadcastReadableMessageFactory');
import BroadcastWritableMessageFactory = require('./broadcast/messages/BroadcastWritableMessageFactory');
import WritableFileTransferMessageFactory = require('./fileTransfer/messages/WritableFileTransferMessageFactory');
import ReadableFileTransferMessageFactory = require('./fileTransfer/messages/ReadableFileTransferMessageFactory');
import ReadableQueryResponseMessageFactory = require('./fileTransfer/messages/ReadableQueryResponseMessageFactory');
import WritableQueryResponseMessageFactory = require('./fileTransfer/messages/WritableQueryResponseMessageFactory');
import QueryFactory = require('./fileTransfer/query/QueryFactory');
import QueryManagerInterface = require('./fileTransfer/query/interfaces/QueryManagerInterface');
import QueryManager = require('./fileTransfer/query/QueryManager');
import ResponseManagerInterface = require('./fileTransfer/query/interfaces/ResponseManagerInterface');
import ResponseManager = require('./fileTransfer/query/ResponseManager');
import SearchMessageBridgeInterface = require('../search/interfaces/SearchMessageBridgeInterface');

var logger = require('../utils/logger/LoggerFactory').create();

class ProtocolGateway extends events.EventEmitter implements ProtocolGatewayInterface {

	private _myNode:MyNodeInterface = null;
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;
	private _appConfig:ConfigInterface = null;
	private _hydraConfig:ConfigInterface = null;
	private _protocolConfig:ConfigInterface = null;
	private _transferConfig:ConfigInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _topologyConfig:ConfigInterface = null;
	private _pingPongNodeUpdateHandler:PingPongNodeUpdateHandler = null;
	private _findClosestNodesManager:FindClosestNodesManager = null;
	private _nodeSeekerManager:NodeSeekerManagerInterface = null;
	private _nodePublishers:NodePublisherList = null;
	private _networkMaintainer:NetworkMaintainerInterface = null;
	private _hydraMessageCenter:HydraMessageCenterInterface = null;
	private _hydraConnectionManager:ConnectionManagerInterface = null;
	private _hydraCircuitManager:CircuitManagerInterface = null;
	private _hydraCellManager:CellManagerInterface = null;
	private _middleware:MiddlewareInterface = null;
	private _transferMessageCenter:TransferMessageCenter = null;
	private _broadcastManager:BroadcastManagerInterface = null;
	private _queryManager:QueryManagerInterface = null;
	private _responseManager:ResponseManagerInterface = null;
	private _searchBridge:SearchMessageBridgeInterface = null;

	constructor (appConfig:ConfigInterface, protocolConfig:ConfigInterface, topologyConfig:ConfigInterface, hydraConfig:ConfigInterface, transferConfig:ConfigInterface, myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface, routingTable:RoutingTableInterface, searchBridge:SearchMessageBridgeInterface) {
		super();

		this._appConfig = appConfig;
		this._protocolConfig = protocolConfig;
		this._topologyConfig = topologyConfig;
		this._hydraConfig = hydraConfig;
		this._transferConfig = transferConfig;

		this._myNode = myNode;
		this._tcpSocketHandler = tcpSocketHandler;
		this._routingTable = routingTable;

		this._searchBridge = searchBridge;

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

		// FileTransfer things
		var writableFileTransferMessageFactory = new WritableFileTransferMessageFactory();
		var readableFileTransferMessageFactory = new ReadableFileTransferMessageFactory();
		var readableQueryResponseMessageFactory = new ReadableQueryResponseMessageFactory();
		var writableQueryResponseMessageFactory = new WritableQueryResponseMessageFactory();
		var readableBroadcastMessageFactory = new BroadcastReadableMessageFactory();
		var writableBroadcastMessageFactory = new BroadcastWritableMessageFactory();

		this._middleware = new Middleware(this._hydraCellManager, this._protocolConnectionManager, this._hydraMessageCenter, writableFileTransferMessageFactory);
		this._transferMessageCenter = new TransferMessageCenter(this._protocolConnectionManager, this._middleware, this._hydraCircuitManager, this._hydraCellManager, this._hydraMessageCenter, readableFileTransferMessageFactory, writableFileTransferMessageFactory, readableQueryResponseMessageFactory, writableQueryResponseMessageFactory);

		this._broadcastManager = new BroadcastManager(this._topologyConfig, this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable, readableBroadcastMessageFactory, writableBroadcastMessageFactory);

		var queryFactory = new QueryFactory(this._transferConfig, this._transferMessageCenter, this._hydraCircuitManager, this._broadcastManager);

		this._queryManager = new QueryManager(this._transferConfig, queryFactory, this._hydraCircuitManager, this._searchBridge);

		this._responseManager = new ResponseManager(this._transferConfig, this._hydraCellManager, this._transferMessageCenter, this._searchBridge, this._broadcastManager, this._hydraCircuitManager, writableQueryResponseMessageFactory);
	}

	public start ():void {
		/**
		 *
		 * If it needs a proxy, kick off proxy manager only when the NetworkMaintainer has finished its entry
		 * If it doesnt need a proxy, kick off proxy manager right away
		 *
		 */

		logger.log('topology', 'New node joining the network', {id: this._myNode.getId().toHexString()});

		if (this._proxyManager.needsAdditionalProxy()) {
			this._networkMaintainer.once('initialContactQueryCompleted', () => {
				this._proxyManager.kickOff();
			});
		}
		else {
			this._proxyManager.kickOff();
		}

		this._networkMaintainer.once('initialContactQueryCompleted', () => {
			logger.log('topology', 'Initial contact query completed. Kicking off proxy manager...', {id: this._myNode.getId().toHexString()});
		});

		this._networkMaintainer.once('joinedNetwork', () => {
			logger.log('topology', 'Successfully joined the network.', {id: this._myNode.getId().toHexString()});

			// start the hydra things
			this._hydraCircuitManager.kickOff();

			this._hydraCircuitManager.once('desiredCircuitAmountReached', () => {
				logger.log('hydra', 'Hydra circuits constructed.', {id: this._myNode.getId().toHexString()});
				this.emit('readyToSearch');
			});
		});

		this._networkMaintainer.joinNetwork();

	}


}

export = ProtocolGateway;