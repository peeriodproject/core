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
import UploadBridgeInterface = require('../share/interfaces/UploadBridgeInterface');
import DownloadBridgeInterface = require('../share/interfaces/DownloadBridgeInterface');
import FeedingNodesBlockMaintainerFactory = require('./fileTransfer/share/FeedingNodesBlockMaintainerFactory');
import ShareMessengerFactory = require('./fileTransfer/share/ShareMessengerFactory');
import FileBlockWriterFactory = require('../fs/FileBlockWriterFactory');
import FileBlockReaderFactory = require('../fs/FileBlockReaderFactory');
import DownloadFactoryInterface = require('./fileTransfer/share/interfaces/DownloadFactoryInterface');
import Aes128GcmDownloadFactory = require('./fileTransfer/share/Aes128GcmDownloadFactory');
import DownloadManager = require('./fileTransfer/share/DownloadManager');
import DownloadManagerInterface = require('./fileTransfer/share/interfaces/DownloadManagerInterface');
import UploadFactoryInterface = require('./fileTransfer/share/interfaces/UploadFactoryInterface');
import Aes128GcmUploadFactory = require('./fileTransfer/share/Aes128GcmUploadFactory');
import UploadManager = require('./fileTransfer/share/UploadManager');
import UploadManagerInterface = require('./fileTransfer/share/interfaces/UploadManagerInterface');
import ReadableShareRequestMessageFactory = require('./fileTransfer/share/messages/ReadableShareRequestMessageFactory');

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
	private _downloadBridge:DownloadBridgeInterface = null;
	private _uploadBridge:UploadBridgeInterface = null;
	private _downlodManager:DownloadManagerInterface = null;
	private _uploadManager:UploadManagerInterface = null;


	constructor (appConfig:ConfigInterface, protocolConfig:ConfigInterface, topologyConfig:ConfigInterface, hydraConfig:ConfigInterface, transferConfig:ConfigInterface, myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface, routingTable:RoutingTableInterface, searchBridge:SearchMessageBridgeInterface, downloadBridge:DownloadBridgeInterface, uploadBridge:UploadBridgeInterface) {
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
		this._downloadBridge = downloadBridge;
		this._uploadBridge = uploadBridge;

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
		var nodeSeekerFactory:NodeSeekerFactory = new NodeSeekerFactory(this._appConfig, this._protocolConfig, this._routingTable);

		this._nodeSeekerManager = new NodeSeekerManager(this._protocolConfig, this._myNode, nodeSeekerFactory, this._protocolConnectionManager, this._proxyManager);

		// build up the NodePublishers
		var nodePublisherFactory = new NodePublisherFactory(appConfig, protocolConfig, this._myNode);

		if (this._tcpSocketHandler.getOpenServerPortsArray().length) {
			nodePublisherFactory.createPublisherList((list:NodePublisherList) => {
				this._nodePublishers = list;
			});
		}

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
		var hydraCircuitFactory = new HydraCircuitFactory(this._hydraConfig, this._routingTable, this._hydraConnectionManager, this._hydraMessageCenter, circuitExtenderFactory, aes128GcmLayeredEncDecHandlerFactory, this._tcpSocketHandler);
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

		this._transferMessageCenter = new TransferMessageCenter(this._protocolConnectionManager, this._hydraCircuitManager, this._hydraCellManager, this._hydraMessageCenter, readableFileTransferMessageFactory, writableFileTransferMessageFactory, readableQueryResponseMessageFactory, writableQueryResponseMessageFactory);
		this._middleware = new Middleware(this._protocolConfig, this._transferMessageCenter, this._hydraCellManager, this._protocolConnectionManager, this._hydraMessageCenter, writableFileTransferMessageFactory);
		this._transferMessageCenter.setMiddleware(this._middleware);

		this._broadcastManager = new BroadcastManager(this._topologyConfig, this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable, readableBroadcastMessageFactory, writableBroadcastMessageFactory);

		// query manager is not needed with a raw node
		if (this._searchBridge) {
			var queryFactory = new QueryFactory(this._transferConfig, this._transferMessageCenter, this._hydraCircuitManager, this._broadcastManager);

			this._queryManager = new QueryManager(this._transferConfig, queryFactory, this._hydraCircuitManager, this._searchBridge);
		}

		this._responseManager = new ResponseManager(this._transferConfig, this._hydraCellManager, this._transferMessageCenter, this._searchBridge, this._broadcastManager, this._hydraCircuitManager, writableQueryResponseMessageFactory);

		// Upload/Download things
		var feedingNodesBlockMaintainerFactory = new FeedingNodesBlockMaintainerFactory(this._hydraCircuitManager);
		var shareMessengerFactory = new ShareMessengerFactory(this._transferConfig, this._hydraCircuitManager, this._transferMessageCenter);
		var fileBlockWriterFactory = new FileBlockWriterFactory();
		var fileBlockReaderFactory = new FileBlockReaderFactory();

		var downloadFactory:DownloadFactoryInterface = new Aes128GcmDownloadFactory(feedingNodesBlockMaintainerFactory, shareMessengerFactory, fileBlockWriterFactory, this._transferMessageCenter);
		var uploadFactory:UploadFactoryInterface = new Aes128GcmUploadFactory(this._transferConfig, feedingNodesBlockMaintainerFactory, shareMessengerFactory, fileBlockReaderFactory, this._transferMessageCenter);
		var readableShareRequestMessageFactory = new ReadableShareRequestMessageFactory();


		if (this._downloadBridge) {
			this._downlodManager = new DownloadManager(this._transferConfig, this._hydraCircuitManager, this._downloadBridge, downloadFactory);
		}

		if (this._uploadBridge) {
			this._uploadManager = new UploadManager(this._transferConfig, this._transferMessageCenter, uploadFactory, readableShareRequestMessageFactory, this._uploadBridge);
		}

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
			this.emit('NEEDS_PROXY', true);

			this._networkMaintainer.once('initialContactQueryCompleted', () => {

				this._proxyManager.kickOff();
			});
		}
		else {
			this.emit('NEEDS_PROXY', false);

			this._proxyManager.kickOff();
		}

		this._networkMaintainer.on('foundEntryNode', () => {
			this.emit('FOUND_ENTRY_NODE');
		});

		this._proxyManager.on('proxyCount', (count:number) => {
			this.emit('NUM_OF_PROXIES', count);
		});

		this._proxyManager.on('proxyingForCount', (count:number) => {
			this.emit('NUM_OF_PROXYING_FOR', count);
		});

		this._networkMaintainer.once('initialContactQueryCompleted', () => {
			this.emit('INITIAL_CONTACT_QUERY_COMPLETE');
			logger.log('topology', 'Initial contact query completed. Kicking off proxy manager...', {id: this._myNode.getId().toHexString()});
		});

		this._networkMaintainer.once('joinedNetwork', () => {
			this.emit('TOPOLOGY_JOIN_COMPLETE');

			logger.log('topology', 'Successfully joined the network.', {id: this._myNode.getId().toHexString()});

			// start the hydra things
			this._hydraCircuitManager.kickOff();

			this._hydraCircuitManager.on('circuitCount', (count:number) => {
				this.emit('NUM_OF_HYDRA_CIRCUITS', count);
				logger.log('hydra', 'Maintaining currently' + count + ' circuits');
			});

			this._hydraCircuitManager.on('desiredCircuitAmountReached', () => {
				logger.log('hydraSuccess', 'Hydra circuits constructed.', {id: this._myNode.getId().toHexString()});
				this.emit('readyToSearch');
				this.emit('HYDRA_CIRCUITS_DESIRED_AMOUNT_REACHED');
			});

			this._hydraCellManager.on('cellCount', (count:number) => {
				this.emit('NUM_OF_HYDRA_CELLS', count);
			});
		});

		this._networkMaintainer.joinNetwork();
		this.emit('JOIN_NETWORK');
		this.emit('DESIRED_AMOUNT_OF_CIRCUITS', this._hydraCircuitManager.getDesiredNumberOfCircuits());
	}


}

export = ProtocolGateway;