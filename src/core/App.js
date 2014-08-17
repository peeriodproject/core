var crypto = require('crypto');
var path = require('path');
var fs = require('fs-extra');

// global imports
var JSONConfig = require('./config/JSONConfig');
var ObjectConfig = require('./config/ObjectConfig');

var i18n = require('i18n');

var loggerFactory = require('./utils/logger/LoggerFactory');
loggerFactory.setLogPath('/Volumes/HDD/logs/');
var logger = loggerFactory.create();

var AppQuitHandler = require('./utils/AppQuitHandler');

// topology imports
var BucketFactory = require('./topology/BucketFactory');
var BucketStore = require('./topology/BucketStore');

var ContactNodeAddressFactory = require('./topology/ContactNodeAddressFactory');
var ContactNodeFactory = require('./topology/ContactNodeFactory');

var Id = require('./topology/Id');
var JSONStateHandlerFactory = require('./utils/JSONStateHandlerFactory');
var JSONWebIp = require('./net/ip/JSONWebIp');
var MyNode = require('./topology/MyNode');
var NetworkBootstrapper = require('./net/NetworkBootstrapper');

var ProtocolGateway = require('./protocol/ProtocolGateway');

var RoutingTable = require('./topology/RoutingTable');
var TCPSocketHandlerFactory = require('./net/tcp/TCPSocketHandlerFactory');

// search imports
var SearchStoreFactory = require('./search/SearchStoreFactory');
var SearchItemFactory = require('./search/SearchItemFactory');
var SearchClient = require('./search/SearchClient');
var SearchManager = require('./search/SearchManager');
var SearchRequestManager = require('./search/SearchRequestManager');
var SearchResponseManager = require('./search/SearchResponseManager');
var SearchMessageBridge = require('./search/SearchMessageBridge');
var SearchFormResultsManager = require('./search/SearchFormResultsManager');

var PluginFinder = require('./plugin/PluginFinder');
var PluginValidator = require('./plugin/PluginValidator');
var PluginLoaderFactory = require('./plugin/PluginLoaderFactory');
var PluginRunnerFactory = require('./plugin/PluginRunnerFactory');
var PluginManager = require('./plugin/PluginManager');

var FolderWatcherFactory = require('./fs/FolderWatcherFactory');
var FolderWatcherManager = require('./fs/FolderWatcherManager');
var PathValidator = require('./fs/PathValidator');

var IndexManager = require('./search/IndexManager');

// Share import
var DownloadManager = require('./share/DownloadManager');
var UploadManager = require('./share/UploadManager');

var DownloadBridge = require('./share/DownloadBridge');
var UploadBridge = require('./share/UploadBridge');

// ui imports
var UiShareManagerComponent = require('./ui/share/UiShareManagerComponent');
var UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
var UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');

var UiProtocolGatewayComponent = require('./ui/protocol/UiProtocolGatewayComponent');
var UiSearchFormResultsManagerComponent = require('./ui/search/UiSearchFormResultsManagerComponent');
var UiManager = require('./ui/UiManager');
var UiSplashScreen = require('./ui/UiSplashScreen');
var UiRoutinesManager = require('./ui/UiRoutinesManager');
var UiChromeExtensionRoutine = require('./ui/routines/UiChromeExtensionRoutine');

// Testing purposes only
var nameFixtures = require('../config/nameFixtures');

i18n.configure({
    locales: ['en', 'de'],
    directory: './locales'
});

var App = {
    appQuitHandler: null,
    _environmentConfigPath: '',
    _environmentConfig: null,
    _environmentConfigDefaults: {
        startUi: false,
        startSearchDatabase: false,
        startIndexer: false,
        startTopology: true
    },
    _mainConfig: null,
    _gui: null,
    _dataPath: '',
    _i18n: null,
    _splashScreen: null,
    _uiComponents: [],
    _requestManager: null,
    _responseManager: null,
    _stateHandlerFactory: null,
    addUiComponent: function (component) {
        if (this._environmentConfig.get('environment.startUi')) {
            this._uiComponents.push(component);
        } else {
            component = null;
        }
    },
    /**
    * Returns a JSONStateHandlerFactory by using the singleton pattern
    *
    * @returns {core.utils.JSONStateHandlerFactory}
    */
    getJSONStateHandlerFactory: function () {
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
    getDataPath: function () {
        return this._dataPath;
    },
    getMainConfig: function (configKeys) {
        return new ObjectConfig(this._mainConfig, configKeys);
    },
    /**
    * Sets the environment config path
    *
    * @param {string} configPath
    */
    setConfigPath: function (configPath) {
        this._environmentConfigPath = configPath;
    },
    /**
    * Loads the environment config from the specified config path or creates an empty config instance
    */
    _loadConfig: function () {
        this._environmentConfig = this._environmentConfigPath ? new JSONConfig(this._environmentConfigPath) : new ObjectConfig(this._environmentConfigDefaults);
        this._mainConfig = require('../config/mainConfig.json');

        this._mainConfig.app.dataPath = this._dataPath;
    },
    /**
    * Sets the locale of the app interface
    *
    * @param {string} locale
    */
    setLocale: function (locale) {
        console.log('set locale', locale);
        i18n.setLocale(locale);
    },
    _initSplashScreen: function () {
        this._splashScreen = this._environmentConfig.get('environment.startUi') ? new UiSplashScreen(this._gui) : null;
    },
    _setSplashScreenStatus: function (status) {
        if (this._splashScreen) {
            this._splashScreen.setStatus(status);
        }
    },
    start: function (gui, nwApp, dataPath, win) {
        process.on('uncaughtException', function (err) {
            console.log('Uncaught exception');
            console.log(err);
        });

        this._gui = gui;
        this._dataPath = dataPath;

        this.appQuitHandler = new AppQuitHandler(nwApp);
        this._loadConfig();

        if (win && win.showDevTools) {
            win.showDevTools();
        }

        this._initSplashScreen();

        // copy node discovery.json to app data path
        var nodeDiscoveryPath = path.resolve(this.getDataPath(), 'nodeDiscovery.json');

        if (!fs.existsSync(nodeDiscoveryPath)) {
            fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
        }

        if (this._environmentConfig.get('environment.startSearchDatabase')) {
            this.startSearchDatabase();
        } else {
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
        var _this = this;
        this.startSearchClient(function (searchConfig, searchClient) {
            var searchRequestsIndexName = 'searchrequests';

            var searchRequestManager = new SearchRequestManager(_this.appQuitHandler, searchRequestsIndexName, searchClient);
            var searchResponseManager = new SearchResponseManager(_this.appQuitHandler, searchClient);
            var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

            _this.startIndexer(searchConfig, searchClient, searchRequestManager, searchResponseManager);

            _this.startSharing(searchClient, searchRequestsIndexName, function (downloadManager, uploadManager) {
                var downloadBridge = new DownloadBridge(downloadManager);
                var uploadBridge = new UploadBridge(uploadManager);

                // disables the network layer for testing purposes
                _this.startTopology(searchMessageBridge, downloadBridge, uploadBridge);
            });

            _this._requestManager = searchRequestManager;
            _this._responseManager = searchResponseManager;
        });
    },
    startSharing: function (searchClient, searchRequestsIndexName, callback) {
        var internalCallback = callback || function () {
        };

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
    startIndexer: function (searchConfig, searchClient, searchRequestManager, searchResponseManager, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

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
            onOpenCallback: function () {
                searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
                folderWatcherManager = new FolderWatcherManager(_this.getMainConfig(['app', 'fs']), _this.appQuitHandler, _this.getJSONStateHandlerFactory(), folderWatcherFactory, {
                    onOpenCallback: function () {
                        indexManager = new IndexManager(searchConfig, _this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);
                        pluginManager.activatePluginState(function (err) {
                            if (err) {
                                logger.error(err);
                            }

                            searchFormResultsManager = new SearchFormResultsManager(_this.getMainConfig(['app', 'search']), _this.appQuitHandler, _this.getJSONStateHandlerFactory(), pluginManager, searchRequestManager);
                            _this.addUiComponent(new UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager));

                            console.log('started indexer');

                            return internalCallback();
                        });
                    }
                });

                _this.addUiComponent(new UiFolderWatcherManagerComponent(_this._gui, folderWatcherManager));
            }
        });
        //this.addUiComponent(new UiPluginManagerComponent(pluginManager));
    },
    // index database setup
    startSearchClient: function (callback) {
        var internalCallback = callback || function () {
        };
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
        var _this = this;
        if (!this._environmentConfig.get('environment.startUi')) {
            return;
        }

        this._setSplashScreenStatus('startUi');

        this.addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));

        var uiManager = new UiManager(this.getMainConfig(['ui']), this.appQuitHandler, this._uiComponents);

        if (this._splashScreen) {
            this._splashScreen.once('close', function () {
                _this.checkUiRoutines();
            });
        }
    },
    checkUiRoutines: function () {
        var uiRoutinesManager = new UiRoutinesManager(this._gui);
        uiRoutinesManager.addUiRoutine(new UiChromeExtensionRoutine(new JSONConfig('../../config/uiChromeExtensionRoutine.json', ['extension'])));

        uiRoutinesManager.getInstalledRoutineIds(function (err, routineIds) {
            if (!routineIds || !routineIds.length) {
                uiRoutinesManager.open();
            } else {
                uiRoutinesManager.getUiRoutine(routineIds[0]).start();
            }
        });
    },
    startTopology: function (searchMessageBridge, downloadBridge, uploadBridge) {
        var _this = this;
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

        networkBootstrapper.bootstrap(function (err) {
            if (err) {
                logger.error('Network Bootstrapper: ERROR', {
                    err: err
                });
                return;
            }

            // build up our node
            var myIp = networkBootstrapper.getExternalIp();
            var tcpSocketHandler = networkBootstrapper.getTCPSocketHandler();
            var myOpenPorts = tcpSocketHandler.getOpenServerPortsArray();
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

            console.log(path.resolve(_this.getDataPath(), 'myId.json'));
            var idState = _this.getJSONStateHandlerFactory().create(path.resolve(_this.getDataPath(), 'myId.json'));

            idState.load(function (err, state) {
                if (err)
                    console.log(err);
                var myId = null;

                console.log(state);

                if (state && state.id) {
                    myId = new Id(Id.byteBufferByHexString(state.id, 20), 160);
                } else {
                    state = {};
                    var randBuffer = crypto.randomBytes(20);
                    state.id = randBuffer.toString('hex');
                    idState.save(state, function () {
                        console.log('Id state saved.');
                    });

                    myId = new Id(randBuffer, 160);
                }

                logger.log('topology', 'My ID is: ' + myId.toHexString());

                myNode = new MyNode(myId, addressList);

                bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
                bucketFactory = new BucketFactory();
                contactNodeFactory = new ContactNodeFactory();
                routingTable = new RoutingTable(topologyConfig, _this.appQuitHandler, myId, bucketFactory, bucketStore, contactNodeFactory, {
                    onOpenCallback: function (err) {
                        if (err) {
                            console.error(err);
                        }

                        protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, hydraConfig, transferConfig, myNode, tcpSocketHandler, routingTable, searchMessageBridge, downloadBridge, uploadBridge);
                        _this.addUiComponent(new UiProtocolGatewayComponent(protocolGateway, _this._splashScreen));

                        _this.startUi();

                        protocolGateway.start();
                        global.gateway = protocolGateway;
                    }
                });
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=App.js.map
