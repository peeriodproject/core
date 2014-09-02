import crypto = require('crypto');
import path = require('path');
import fs = require('fs-extra');

// global imports
import JSONConfig = require('./config/JSONConfig');
import ObjectConfig = require('./config/ObjectConfig');

var i18n = require('i18n');

var loggerFactory = require('./utils/logger/LoggerFactory');
loggerFactory.setLogPath('/Volumes/HDD/logs/');
var logger = loggerFactory.create();

// interfaces
import ConfigInterface = require('./config/interfaces/ConfigInterface');
import UiComponentInterface = require('./ui/interfaces/UiComponentInterface');

import AppQuitHandler = require('./utils/AppQuitHandler');

// topology imports
import BucketFactory = require('./topology/BucketFactory');
import BucketStore = require('./topology/BucketStore');
import ObjectBucketStore = require('./topology/ObjectBucketStore');
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
import UiDaemon = require('./ui/UiDaemon');
import UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
import UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');
import UiOpenPortsComponent = require('./ui/protocol/UiOpenPortsComponent');
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

	_appQuitHandler: null,

	_environmentConfigPath    : '',
	_environmentConfig        : null,
	_environmentConfigDefaults: {
		startUi             : false,
		_startSearchDatabase: false,
		startIndexer        : false,
		startTopology       : true
	},
	_mainConfig               : null,

	_gui     : null,
	_dataPath: '',

	_i18n               : null,
	_splashScreen       : null,
	_uiComponents       : [],
	_requestManager     : null,
	_responseManager    : null,
	_stateHandlerFactory: null,

	_addUiComponent             : function (component:UiComponentInterface):void {
		if (this._environmentConfig.get('environment.startUi')) {
			this._uiComponents.push(component);
		}
		else {
			component = null;
		}
	},
	_uiComponentsAdded          : [],
	_requiredUiComponentsToStart: ['indexer', 'sharing', 'topology'],
	// todo docs
	_tray: null,

	/**
	 * Returns a JSONStateHandlerFactory by using the singleton pattern
	 *
	 * @returns {core.utils.JSONStateHandlerFactory}
	 */
	_getJSONStateHandlerFactory: function ():JSONStateHandlerFactory {
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

	_getMainConfig: function (configKeys:Array<string>):ConfigInterface {
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

		this._mainConfig.app.dataPath = this._dataPath;
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

		process.on('uncaughtException', (err:Error) => {
			console.error(err);
			logger.error(err);
		});

		this._gui = gui;
		this._dataPath = dataPath;

		this._appQuitHandler = new AppQuitHandler(nwApp);
		this._loadConfig();

		/*var mainWin = this._gui.Window.get();

		if (mainWin && mainWin.showDevTools) {
			try {
				mainWin.showDevTools();
			}
			catch (e) {
				console.error(e);
			}
		}*/
		this._initSplashScreen();

		if (this._environmentConfig.get('environment.startSearchDatabase')) {
			this._startSearchDatabase();
		}
		else {
			this._startTopology(null, null, null);
		}

		this._startUiDaemon();
	},

	getAppQuitHandler: function () {
		return this._appQuitHandler;
	},

	getTray: function () {
		return this._tray;
	},

	quit: function () {
		console.log('quitting...');
		return process.nextTick(function () {
			this.getAppQuitHandler().quit();
		}.bind(this));
	},

	_startSearchDatabase: function () {
		this._startSearchClient((searchConfig, searchClient) => {
			var searchRequestsIndexName:string = 'searchrequests';

			var searchRequestManager = new SearchRequestManager(this.getAppQuitHandler(), searchRequestsIndexName, searchClient);
			var searchResponseManager = new SearchResponseManager(this.getAppQuitHandler(), searchClient);
			var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

			this._startIndexer(searchConfig, searchClient, searchRequestManager, searchResponseManager, () => {
				this._checkAndStartUi('indexer');
			});

			this._startSharing(searchClient, searchRequestsIndexName, (downloadManager, uploadManager) => {
				var downloadBridge = new DownloadBridge(downloadManager);
				var uploadBridge = new UploadBridge(uploadManager);

				this._checkAndStartUi('sharing');

				// disables the network layer for testing purposes
				this._startTopology(searchMessageBridge, downloadBridge, uploadBridge);
			});

			this._requestManager = searchRequestManager;
			this._responseManager = searchResponseManager;
		});
	},

	_startSharing: function (searchClient, searchRequestsIndexName, callback:Function) {
		var internalCallback = callback || function () {
		};

		if (!this._environmentConfig.get('environment.startSearchDatabase')) {
			return process.nextTick(internalCallback.bind(null, null, null));
		}

		this._setSplashScreenStatus('startSharing');

		//var shareConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'share']);
		var downloadManager = new DownloadManager(this._getMainConfig(['app', 'share']), this.getAppQuitHandler(), this._getJSONStateHandlerFactory(), searchClient, searchRequestsIndexName);
		var uploadManager = new UploadManager(this.getAppQuitHandler(), searchClient, searchRequestsIndexName);

		this._addUiComponent(new UiShareManagerComponent(this._gui, downloadManager, uploadManager));

		return process.nextTick(internalCallback.bind(null, downloadManager, uploadManager));
	},

	_startIndexer     : function (searchConfig, searchClient, searchRequestManager, searchResponseManager, callback:Function) {
		var internalCallback = callback || function () {
		};

		if (!this._environmentConfig.get('environment.startSearchDatabase') || !this._environmentConfig.get('environment.startIndexer')) {
			return process.nextTick(internalCallback.bind(null));
		}

		this._setSplashScreenStatus('startIndexer');

		var pluginConfig = this._getMainConfig(['app', 'plugin']);

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

		var pluginManager = new PluginManager(pluginConfig, this._getJSONStateHandlerFactory(), pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: () => {
				searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
				folderWatcherManager = new FolderWatcherManager(this._getMainConfig(['app', 'fs']), this.getAppQuitHandler(), this._getJSONStateHandlerFactory(), folderWatcherFactory, {
					onOpenCallback: () => {
						indexManager = new IndexManager(searchConfig, this.getAppQuitHandler(), folderWatcherManager, pathValidator, searchManager);
						pluginManager.activatePluginState((err) => {
							if (err) {
								logger.error(err)
							}

							searchFormResultsManager = new SearchFormResultsManager(this._getMainConfig(['app', 'search']), this.getAppQuitHandler(), this._getJSONStateHandlerFactory(), pluginManager, searchRequestManager);
							this._addUiComponent(new UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager));

							return internalCallback();
						});
					}
				});

				this._addUiComponent(new UiFolderWatcherManagerComponent(this._gui, folderWatcherManager));
			}
		});

		//this._addUiComponent(new UiPluginManagerComponent(pluginManager));
	},

	// index database setup
	_startSearchClient: function (callback) {
		var internalCallback = callback || function () {
		};
		var searchConfig = this._getMainConfig(['search']);
		var searchStoreFactory = new SearchStoreFactory();
		var searchItemFactory = new SearchItemFactory();

		this._setSplashScreenStatus('startSearchDatabase');

		var searchClient = new SearchClient(searchConfig, this.getAppQuitHandler(), 'mainIndex', searchStoreFactory, searchItemFactory, {
			onOpenCallback: function (err) {
				console.log(err);
				return internalCallback(searchConfig, searchClient);
			}
		});
	},

	_startUiDaemon: function () {
		if (!this._environmentConfig.get('environment.startUi')) {
			return null;
		}

		var uiDaemon = new UiDaemon(this._gui, this.getAppQuitHandler());

		this._tray = uiDaemon.getTray();
	},

	_startUi: function () {
		if (!this._environmentConfig.get('environment.startUi')) {
			return;
		}

		this._setSplashScreenStatus('startUi');

		this._addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));
		var openPortsConfig = this._getMainConfig(['app', 'net']);

		this._addUiComponent(new UiOpenPortsComponent(this._getJSONStateHandlerFactory().create(path.join(openPortsConfig.get('app.dataPath'), openPortsConfig.get('net.myOpenPortsStateConfig')))));

		var uiManager = new UiManager(this._getMainConfig(['ui']), this.getAppQuitHandler(), this._uiComponents);

		if (this._splashScreen) {
			this._splashScreen.once('close', () => {
				this._checkUiRoutines();
			});
		}
	},

	_checkAndStartUi: function (component) {
		var readyToTakeOff:boolean = true;

		this._uiComponentsAdded.push(component);

		for (var i = 0, l = this._requiredUiComponentsToStart.length; i < l; i++) {
			if (this._uiComponentsAdded.indexOf(this._requiredUiComponentsToStart[i]) === -1) {
				readyToTakeOff = false;
				break;
			}
		}

		if (readyToTakeOff) {
			this._startUi();
		}
	},

	_checkUiRoutines: function () {
		console.log('checking ui routines');
		var uiRoutinesManager = new UiRoutinesManager(this._gui);
		uiRoutinesManager.addUiRoutine(new UiChromeExtensionRoutine(new JSONConfig('../../config/uiChromeExtensionRoutine.json', ['extension'])));

		uiRoutinesManager.getInstalledRoutineIds(function (err, routineIds) {
			if (!routineIds || !routineIds.length) {
				uiRoutinesManager.open();
				console.log('ui routines: opened manager');
			}
			else {
				uiRoutinesManager.getUiRoutine(routineIds[0]).start();
			}
		});
	},

	_startTopology: function (searchMessageBridge, downloadBridge, uploadBridge) {
		if (!this._environmentConfig.get('environment.startTopology')) {
			this._checkAndStartUi('topology');

			if (this._splashScreen) {
				setImmediate(() => {
					console.log('closing splashscreen');
					this._splashScreen.close();
				});
			}

			return;
		}

		this._setSplashScreenStatus('startTopology');

		var topologyConfig = this._getMainConfig('topology');

		var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
		var jsonWebIp = new JSONWebIp();
		var nodeAddressFactory = new ContactNodeAddressFactory();
		var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, this._getMainConfig(['app', 'net']), this._getJSONStateHandlerFactory(), [jsonWebIp]);
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

			var idState = this._getJSONStateHandlerFactory().create(path.resolve(this.getDataPath(), 'myId.json'));

			idState.load((err:Error, state:any) => {
				if (err) console.log(err);
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


				logger.log('topology', 'My ID is: ' + myId.toHexString());

				myNode = new MyNode(myId, addressList);

				//bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
				bucketStore = new ObjectBucketStore('objectBucketStore', topologyConfig.get('topology.bucketStore.databasePath'), 2);
				bucketFactory = new BucketFactory();
				contactNodeFactory = new ContactNodeFactory();
				routingTable = new RoutingTable(topologyConfig, this.getAppQuitHandler(), myId, bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: (err) => {
						if (err) {
							console.error(err);
						}

						protocolGateway = new ProtocolGateway(this._getMainConfig('app'), this._getMainConfig('protocol'), topologyConfig, this._getMainConfig('hydra'), this._getMainConfig('fileTransfer'), myNode, tcpSocketHandler, routingTable, searchMessageBridge, downloadBridge, uploadBridge);

						this._addUiComponent(new UiProtocolGatewayComponent(protocolGateway, this._splashScreen));
						this._checkAndStartUi('topology');

						protocolGateway.start();
						global.gateway = protocolGateway;
					}
				});
			});
		});
	}
}

export = App;