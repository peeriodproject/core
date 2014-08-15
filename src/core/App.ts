import crypto = require('crypto');
import path = require('path');
import fs = require('fs-extra');

// global imports
import JSONConfig = require('./config/JSONConfig');
import ObjectConfig = require('./config/ObjectConfig');

var i18n = require('i18n');
var logger = require('./utils/logger/LoggerFactory').create();

// interfaces
import ConfigInterface = require('./config/interfaces/ConfigInterface');
import UiComponentInterface = require('./ui/interfaces/UiComponentInterface');

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
import SearchFormResultsManager = require('./search/SearchFormResultsManager');

import PluginFinder = require('./plugin/PluginFinder');
import PluginValidator = require('./plugin/PluginValidator');
import PluginLoaderFactory = require('./plugin/PluginLoaderFactory');
import PluginRunnerFactory = require('./plugin/PluginRunnerFactory');
import PluginManager = require('./plugin/PluginManager');

import FolderWatcherFactory = require('./fs/FolderWatcherFactory');
import FolderWatcherManager = require('./fs/FolderWatcherManager');
import PathValidator = require('./fs/PathValidator');

import IndexManager = require('./search/IndexManager');

// Share import
import DownloadManager = require('./share/DownloadManager');
import UploadManager = require('./share/UploadManager');

import DownloadBridge = require('./share/DownloadBridge');
import UploadBridge = require('./share/UploadBridge');

// ui imports
import UiShareManagerComponent = require('./ui/share/UiShareManagerComponent');
import UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
import UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');
import UiPluginManagerComponent = require('./ui/plugin/UiPluginManagerComponent');
import UiProtocolGatewayComponent = require('./ui/protocol/UiProtocolGatewayComponent');
import UiSearchFormResultsManagerComponent = require('./ui/search/UiSearchFormResultsManagerComponent');
import UiManager = require('./ui/UiManager');
import UiSplashScreen = require('./ui/UiSplashScreen');
import UiRoutinesManager = require('./ui/UiRoutinesManager');
import UiChromeExtensionRoutine = require('./ui/routines/UiChromeExtensionRoutine');

// Testing purposes only
var nameFixtures = require('../config/nameFixtures');

i18n.configure({
	locales  : ['en', 'de'],
	directory: './locales'
});

var App = {

	appQuitHandler: null,

	_environmentConfigPath    : '',
	_environmentConfig        : null,
	_environmentConfigDefaults: {
		startUi            : false,
		startSearchDatabase: false,
		startIndexer       : false,
		startTopology      : true
	},
	_mainConfig: null,

	_gui     : null,
	_dataPath: '',

	_i18n               : null,
	_splashScreen       : null,
	_uiComponents       : [],
	_requestManager     : null,
	_responseManager    : null,
	_stateHandlerFactory: null,

	addUiComponent: function (component:UiComponentInterface):void {
		if (this._environmentConfig.get('environment.startUi')) {
			this._uiComponents.push(component);
		}
		else {
			component = null;
		}
	},

	/**
	 * Returns a JSONStateHandlerFactory by using the singleton pattern
	 *
	 * @returns {core.utils.JSONStateHandlerFactory}
	 */
	getJSONStateHandlerFactory: function ():JSONStateHandlerFactory {
		if (!this._stateHandlerFactory) {
			this._stateHandlerFactory = new JSONStateHandlerFactory();
		}

		return this._stateHandlerFactory;
	},

	/**
	 * Returns the application's data path in user's directory
	 *
	 * @returns {string}
	 */
	getDataPath: function ():string {
		return this._dataPath;
	},

	getMainConfig: function (configKeys:Array<string>):ConfigInterface {
		return new ObjectConfig(this._mainConfig, configKeys);
	},

	/**
	 * Sets the environment config path
	 *
	 * @param {string} configPath
	 */
	setConfigPath: function (configPath:string):void {
		this._environmentConfigPath = configPath;
	},

	/**
	 * Loads the environment config from the specified config path or creates an empty config instance
	 */
	_loadConfig: function ():void {
		this._environmentConfig = this._environmentConfigPath ? new JSONConfig(this._environmentConfigPath) : new ObjectConfig(this._environmentConfigDefaults);
		this._mainConfig = require('../config/mainConfig.json');

		// todo update data path here
		// this._mainConfig.app.dataPath = this._dataPath;
	},

	/**
	 * Sets the locale of the app interface
	 *
	 * @param {string} locale
	 */
	setLocale: function (locale:string):void {
		i18n.setLocale(locale);
	},

	_initSplashScreen: function ():void {
		this._splashScreen = this._environmentConfig.get('environment.startUi') ? new UiSplashScreen(this._gui) : null;
	},

	_setSplashScreenStatus: function (status):void {
		if (this._splashScreen) {
			this._splashScreen.setStatus(status);
		}
	},

	start: function (gui, nwApp, dataPath, win) {
		this._gui = gui;
		this._dataPath = dataPath;

		this.appQuitHandler = new AppQuitHandler(nwApp);
		this._loadConfig();

		win.showDevTools();

		this._initSplashScreen();

		// copy node discovery.json to app data path
		var nodeDiscoveryPath = path.resolve(this.getDataPath(), 'nodeDiscovery.json');

		if (!fs.existsSync(nodeDiscoveryPath)) {
			fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
		}

		if (this._environmentConfig.get('environment.startSearchDatabase')) {
			this.startSearchDatabase();
		}
		else {
			this.startTopology(null, null, null);
		}
	},

	quit: function () {
		console.log('quitting...');
		return process.nextTick(function () {
			this.appQuitHandler.quit();
		}.bind(this));
	},

	startSearchDatabase: function () {
		this.startSearchClient((searchConfig, searchClient) => {
			var searchRequestsIndexName:string = 'searchrequests';

			var searchRequestManager = new SearchRequestManager(this.appQuitHandler, searchRequestsIndexName, searchClient);
			var searchResponseManager = new SearchResponseManager(this.appQuitHandler, searchClient);
			var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

			this.startIndexer(searchConfig, searchClient, searchRequestManager, searchResponseManager);

			this.startSharing(searchClient, searchRequestsIndexName, (downloadManager, uploadManager) => {
				var downloadBridge = new DownloadBridge(downloadManager);
				var uploadBridge = new UploadBridge(uploadManager);

				// disables the network layer for testing purposes
				this.startTopology(searchMessageBridge, downloadBridge, uploadBridge);
			});

			this._requestManager = searchRequestManager;
			this._responseManager = searchResponseManager;
		});
	},

	startSharing: function (searchClient, searchRequestsIndexName, callback:Function) {
		var internalCallback = callback || function () {};

		if (!this._environmentConfig.get('environment.startSearchDatabase')) {
			return process.nextTick(internalCallback.bind(null, null, null));
		}

		this._setSplashScreenStatus('startSharing');

		//var shareConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'share']);
		var downloadManager = new DownloadManager(this.getMainConfig(['app', 'share']), this.appQuitHandler, this.getJSONStateHandlerFactory(), searchClient, searchRequestsIndexName);
		var uploadManager = new UploadManager(this.appQuitHandler, searchClient, searchRequestsIndexName);

		this.addUiComponent(new UiShareManagerComponent(downloadManager, uploadManager));

		return process.nextTick(internalCallback.bind(null, downloadManager, uploadManager));
	},

	startIndexer     : function (searchConfig, searchClient, searchRequestManager, searchResponseManager, callback:Function) {
		var internalCallback = callback || function () {};

		if (!this._environmentConfig.get('environment.startSearchDatabase') || !this._environmentConfig.get('environment.startIndexer')) {
			return process.nextTick(internalCallback.bind(null));
		}

		this._setSplashScreenStatus('startIndexer');

		var pluginConfig = this.getMainConfig(['app', 'plugin']);

		var pluginFinder = new PluginFinder(pluginConfig);
		var pluginValidator = new PluginValidator();
		var pluginLoaderFactory = new PluginLoaderFactory();
		var pluginRunnerFactory = new PluginRunnerFactory();

		var searchManager;
		var folderWatcherFactory = new FolderWatcherFactory();
		var pathValidator = new PathValidator();
		var folderWatcherManager;
		var indexManager;
		var searchFormResultsManager;

		var pluginManager = new PluginManager(pluginConfig, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: () => {
				searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
				folderWatcherManager = new FolderWatcherManager(this.getMainConfig(['app', 'fs']), this.appQuitHandler, this.getJSONStateHandlerFactory(), folderWatcherFactory, {
					onOpenCallback: () => {
						indexManager = new IndexManager(searchConfig, this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);
						pluginManager.activatePluginState((err) => {
							if (err) {
								logger.error(err)
							}

							searchFormResultsManager = new SearchFormResultsManager(this.getMainConfig(['app', 'search']), this.appQuitHandler, this.getJSONStateHandlerFactory(), pluginManager, searchRequestManager);
							this.addUiComponent(new UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager));

							console.log('started indexer');

							return internalCallback();
						});
					}
				});

				this.addUiComponent(new UiFolderWatcherManagerComponent(this._gui, folderWatcherManager));
			}
		});

		//this.addUiComponent(new UiPluginManagerComponent(pluginManager));
	},

	// index database setup
	startSearchClient: function (callback) {
		var internalCallback = callback || function () {};
		var searchConfig = this.getMainConfig(['search']);
		var searchStoreFactory = new SearchStoreFactory();
		var searchItemFactory = new SearchItemFactory();

		this._setSplashScreenStatus('startSearchDatabase');

		var searchClient = new SearchClient(searchConfig, this.appQuitHandler, 'mainIndex', searchStoreFactory, searchItemFactory, {
			onOpenCallback: function (err) {
				console.log(err);
				return internalCallback(searchConfig, searchClient);
			}
		});
	},

	startUi: function () {
		if (!this._environmentConfig.get('environment.startUi')) {
			return;
		}

		this._setSplashScreenStatus('startUi');

		this.addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));

		var uiManager = new UiManager(this.getMainConfig(['ui']), this.appQuitHandler, this._uiComponents);

		if (this._splashScreen) {
			this._splashScreen.once('close', () => {
				this.checkUiRoutines();
			});
		}
	},

	checkUiRoutines: function () {
		var uiRoutinesManager = new UiRoutinesManager(this._gui);
		uiRoutinesManager.addUiRoutine(new UiChromeExtensionRoutine(new JSONConfig('../../config/uiChromeExtensionRoutine.json', ['extension'])));

		uiRoutinesManager.getInstalledRoutineIds(function (err, routineIds) {
			if (!routineIds || !routineIds.length) {
				uiRoutinesManager.open();
			}
			else {
				uiRoutinesManager.getUiRoutine(routineIds[0]).start();
			}
		});
	},

	startTopology: function (searchMessageBridge, downloadBridge, uploadBridge) {
		if (!this._environmentConfig.get('environment.startTopology')) {
			return;
		}

		this._setSplashScreenStatus('startTopology');

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


			logger.log('network', 'Bootstrapped the network');

			for (var i = 0; i < myOpenPorts.length; i++) {
				addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
			}

			console.log(path.resolve(this.getDataPath(), 'myId.json'));
			var idState = this.getJSONStateHandlerFactory().create(path.resolve(this.getDataPath(), 'myId.json'));

			idState.load((err:Error, state:any) => {
				if (err) console.log(err);
				var myId = null;

				console.log(state);

				if (state && state.id) {
					myId = new Id(Id.byteBufferByHexString(state.id, 20), 160);
				}
				else {
					state = {};
					var randBuffer = crypto.randomBytes(20);
					state.id = randBuffer.toString('hex');
					idState.save(state, () => {
						console.log('Id state saved.');
					});

					myId = new Id(randBuffer, 160);
				}


				logger.log('topology', 'My ID is: ' + myId.toHexString());

				myNode = new MyNode(myId, addressList);

				bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
				bucketFactory = new BucketFactory();
				contactNodeFactory = new ContactNodeFactory();
				routingTable = new RoutingTable(topologyConfig, this.appQuitHandler, myId, bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: (err) => {
						if (err) {
							console.error(err);
						}

						protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, hydraConfig, transferConfig, myNode, tcpSocketHandler, routingTable, searchMessageBridge, downloadBridge, uploadBridge);
						this.addUiComponent(new UiProtocolGatewayComponent(protocolGateway, this._splashScreen));

						this.startUi();

						protocolGateway.start();
					}
				});
			});
		});
	}
}

export = App;