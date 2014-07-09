import crypto = require('crypto');
import path = require('path');
import fs = require('fs-extra');

// global imports
import JSONConfig = require('./config/JSONConfig');
var logger = require('./utils/logger/LoggerFactory').create();

import AppQuitHandler = require('./utils/AppQuitHandler');

// topology imports
import BucketFactory = require('./topology/BucketFactory');
import BucketStore = require('./topology/BucketStore');
import ContactNode = require('./topology/ContactNode');
import ContactNodeAddress = require('./topology/ContactNodeAddress');
import ContactNodeAddressFactory = require('./topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('./topology/ContactNodeFactory');
import GeneralWritableMessageFactory = require('./protocol/messages/GeneralWritableMessageFactory');
import Id = require('./topology/Id');
import JSONStateHandlerFactory = require('./utils/JSONStateHandlerFactory');
import JSONWebIp = require('./net/ip/JSONWebIp');
import MyNode = require('./topology/MyNode');
import NetworkBootstrapper = require('./net/NetworkBootstrapper');
import ProtocolConnectionManager = require('./protocol/net/ProtocolConnectionManager');
import ProtocolGateway = require('./protocol/ProtocolGateway');
import ReadableMessage = require('./protocol/messages/ReadableMessage');
import RoutingTable = require('./topology/RoutingTable');
import TCPSocketHandlerFactory = require('./net/tcp/TCPSocketHandlerFactory');

// search imports
import SearchStoreFactory = require('./search/SearchStoreFactory');
import SearchItemFactory = require('./search/SearchItemFactory');
import SearchClient = require('./search/SearchClient');
import SearchManager = require('./search/SearchManager');
import SearchRequestManager = require('./search/SearchRequestManager');
import SearchResponseManager = require('./search/SearchResponseManager');
import SearchMessageBridge = require('./search/SearchMessageBridge');

import PluginFinder = require('./plugin/PluginFinder');
import PluginValidator = require('./plugin/PluginValidator');
import PluginLoaderFactory = require('./plugin/PluginLoaderFactory');
import PluginRunnerFactory = require('./plugin/PluginRunnerFactory');
import PluginManager = require('./plugin/PluginManager');

import FolderWatcherFactory = require('./fs/FolderWatcherFactory');
import FolderWatcherManager = require('./fs/FolderWatcherManager');
import PathValidator = require('./fs/PathValidator');

import IndexManager = require('./search/IndexManager');

// ui imports
import UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
import UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');
import UiPluginManagerComponent = require('./ui/plugin/UiPluginManagerComponent');
import UiManager = require('./ui/UiManager');

var App = {

	appQuitHandler: null,

	_uiComponents: [],

	addUiComponent: function (component) {
		this._uiComponents.push(component);
	},

	start: function (gui, nwApp, dataPath, win) {
		win.showDevTools();

		this.appQuitHandler = new AppQuitHandler(nwApp);

		// copy node discovery.json to app data path
		var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
		var nodeDiscoveryPath = path.resolve(appConfig.get('app.dataPath'), 'nodeDiscovery.json');

		if (!fs.existsSync(nodeDiscoveryPath)) {
			fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
		}

		//this.startTopology(dataPath, win);
		this.startSearchClient((searchConfig, searchClient) => {
			var searchRequestManager = new SearchRequestManager(this.appQuitHandler, 'searchrequests', searchClient);
			var searchResponseManager = new SearchResponseManager(this.appQuitHandler, searchClient);

			var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

			this.startTopology(dataPath, searchMessageBridge);
			this.startIndexer(searchConfig, searchClient);

			console.log('started indexer');
			this.startUi(gui);
			console.log('rockn roll!');
		});
	},

	quit: function () {
		console.log('quitting...');
		return process.nextTick(function () {
			this.appQuitHandler.quit();
		}.bind(this));
	},

	startIndexer: function (searchConfig, searchClient) {
		var fsConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'fs']);
		var pluginConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'plugin']);

		var pluginFinder = new PluginFinder(pluginConfig);
		var pluginValidator = new PluginValidator();
		var pluginLoaderFactory = new PluginLoaderFactory();
		var pluginRunnerFactory = new PluginRunnerFactory();

		var searchManager;
		var stateHandlerFactory = new JSONStateHandlerFactory();
		var folderWatcherFactory = new FolderWatcherFactory();
		var pathValidator = new PathValidator();
		var folderWatcherManager;
		var indexManager;

		var pluginManager = new PluginManager(pluginConfig, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: () => {
				// activate plugin state
				pluginManager.activatePluginState(() => {

					searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
					folderWatcherManager = new FolderWatcherManager(fsConfig, this.appQuitHandler, stateHandlerFactory, folderWatcherFactory);
					indexManager = new IndexManager(searchConfig, this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);

					// register ui components
					// ----------------------

					this.addUiComponent(new UiFolderWatcherManagerComponent(folderWatcherManager));
					//this.addUiComponent(new UiPluginManagerComponent(pluginManager));
				});
			}
		});
	},

	// index database setup
	startSearchClient: function (callback) {
		var searchConfig = new JSONConfig('../../config/mainConfig.json', ['search']);

		var searchStoreFactory = new SearchStoreFactory();
		var searchItemFactory = new SearchItemFactory();
		var searchClient = new SearchClient(searchConfig, this.appQuitHandler, 'mainIndex', searchStoreFactory, searchItemFactory, {
			onOpenCallback: function () {
				callback(searchConfig, searchClient);
			}
		});
	},

	startUi: function (gui) {
		var uiConfig = new JSONConfig('../../config/mainConfig.json', ['ui']);

		this.addUiComponent(new UiFolderDropzoneComponent(gui.Window));

		var uiManager = new UiManager(uiConfig, this.appQuitHandler, this._uiComponents);
	},

	startTopology: function (dataPath, searchMessageBridge) {
		var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
		var netConfig = new JSONConfig('../../config/mainConfig.json', ['net']);
		var protocolConfig = new JSONConfig('../../config/mainConfig.json', ['protocol']);
		var topologyConfig = new JSONConfig('../../config/mainConfig.json', ['topology']);
		var hydraConfig = new JSONConfig('../../config/mainConfig.json', ['hydra']);
		var transferConfig = new JSONConfig('../../config/mainConfig.json', ['fileTransfer']);
		var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
		var jsonWebIp = new JSONWebIp();
		var nodeAddressFactory = new ContactNodeAddressFactory();
		var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, netConfig, [jsonWebIp]);
		var protocolGateway = null;

		networkBootstrapper.bootstrap((err) => {
			if (err) {
				logger.error('Network Bootstrapper: ERROR', {
					err: err
				});
				return;
			}

			// build up our node
			var myIp = networkBootstrapper.getExternalIp();
			var tcpSocketHandler = networkBootstrapper.getTCPSocketHandler();
			var myOpenPorts:Array<number> = tcpSocketHandler.getOpenServerPortsArray();
			var addressList = [];

			var myNode = null;

			var bucketStore = null;
			var bucketFactory = null;
			var contactNodeFactory = null;
			var routingTable = null;


			logger.info('bootstrapped the network');

			for (var i = 0; i < myOpenPorts.length; i++) {
				addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
			}

			var handlerFactory = new JSONStateHandlerFactory();
			var idState = handlerFactory.create(path.resolve(dataPath, 'myId.json'));

			idState.load((err:Error, state:any) => {

				var myId = null;

				if (state && state.id) {
					myId = new Id(Id.byteBufferByHexString(state.id, 20), 160);
				}
				else {
					state = {};
					var randBuffer = crypto.randomBytes(20);
					state.id = randBuffer.toString('hex');
					idState.save(state, () => {
					});

					myId = new Id(randBuffer, 160);
				}


				logger.info('My ID is: ' + myId.toHexString());

				myNode = new MyNode(myId, addressList);

				bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
				bucketFactory = new BucketFactory();
				contactNodeFactory = new ContactNodeFactory();
				routingTable = new RoutingTable(topologyConfig, this.appQuitHandler, myId, bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function (err) {
						if (err) {
							console.error(err);
						}

						protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, hydraConfig, transferConfig, myNode, tcpSocketHandler, routingTable);

						//protocolGateway.start();
					}
				});
			});
		});
	}
}

export = App;