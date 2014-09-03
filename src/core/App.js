var crypto = require('crypto');
var path = require('path');

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

var ObjectBucketStore = require('./topology/ObjectBucketStore');

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
var UiDaemon = require('./ui/UiDaemon');
var UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
var UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');
var UiOpenPortsComponent = require('./ui/protocol/UiOpenPortsComponent');

var UiProtocolGatewayComponent = require('./ui/protocol/UiProtocolGatewayComponent');
var UiSearchFormResultsManagerComponent = require('./ui/search/UiSearchFormResultsManagerComponent');
var UiManager = require('./ui/UiManager');
var UiUpdateNotify = require('./ui/UiUpdateNotify');
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
    _appQuitHandler: null,
    _environmentConfigPath: '',
    _environmentConfig: null,
    _environmentConfigDefaults: {
        startUi: false,
        _startSearchDatabase: false,
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
    _addUiComponent: function (component) {
        if (this._environmentConfig.get('environment.startUi')) {
            this._uiComponents.push(component);
        } else {
            component = null;
        }
    },
    _uiComponentsAdded: [],
    _requiredUiComponentsToStart: ['indexer', 'sharing', 'topology'],
    // todo docs
    _tray: null,
    /**
    * Returns a JSONStateHandlerFactory by using the singleton pattern
    *
    * @returns {core.utils.JSONStateHandlerFactory}
    */
    _getJSONStateHandlerFactory: function () {
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
    _getMainConfig: function (configKeys) {
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
        i18n.setLocale(locale);
    },
    _initSplashScreen: function () {
        this._splashScreen = this._environmentConfig.get('environment.startUi') ? new UiSplashScreen(this._gui) : null;
    },
    _checkForUpdates: function () {
        var appConfig = this._getMainConfig(['app']);

        if (!appConfig.get('app.checkForUpdatesOnStartup', false)) {
            return;
        }

        UiUpdateNotify.checkForUpdates(this._gui);
    },
    _setSplashScreenStatus: function (status) {
        if (this._splashScreen) {
            this._splashScreen.setStatus(status);
        }
    },
    start: function (gui, nwApp, dataPath, win) {
        process.on('uncaughtException', function (err) {
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
        } else {
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
        return process.nextTick(function () {
            this.getAppQuitHandler().quit();
        }.bind(this));
    },
    _startSearchDatabase: function () {
        var _this = this;
        this._startSearchClient(function (searchClient) {
            var searchRequestsIndexName = 'searchrequests';

            var searchRequestManager = new SearchRequestManager(_this.getAppQuitHandler(), searchRequestsIndexName, searchClient);
            var searchResponseManager = new SearchResponseManager(_this.getAppQuitHandler(), searchClient);
            var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

            _this._startIndexer(searchClient, searchRequestManager, searchResponseManager, function () {
                _this._checkAndStartUi('indexer');
            });

            _this._startSharing(searchClient, searchRequestsIndexName, function (downloadManager, uploadManager) {
                var downloadBridge = new DownloadBridge(downloadManager);
                var uploadBridge = new UploadBridge(uploadManager);

                _this._checkAndStartUi('sharing');

                // disables the network layer for testing purposes
                _this._startTopology(searchMessageBridge, downloadBridge, uploadBridge);
            });

            _this._requestManager = searchRequestManager;
            _this._responseManager = searchResponseManager;
        });
    },
    _startSharing: function (searchClient, searchRequestsIndexName, callback) {
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
    _startIndexer: function (searchClient, searchRequestManager, searchResponseManager, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };
        var searchConfig = this._getMainConfig(['search']);

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
            onOpenCallback: function () {
                searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
                folderWatcherManager = new FolderWatcherManager(_this._getMainConfig(['app', 'fs']), _this.getAppQuitHandler(), _this._getJSONStateHandlerFactory(), folderWatcherFactory, {
                    onOpenCallback: function () {
                        indexManager = new IndexManager(searchConfig, _this.getAppQuitHandler(), folderWatcherManager, pathValidator, searchManager);
                        pluginManager.activatePluginState(function (err) {
                            if (err) {
                                logger.error(err);
                            }

                            searchFormResultsManager = new SearchFormResultsManager(_this._getMainConfig(['app', 'search']), _this.getAppQuitHandler(), _this._getJSONStateHandlerFactory(), pluginManager, searchRequestManager);
                            _this._addUiComponent(new UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager));

                            return internalCallback();
                        });
                    }
                });

                _this._addUiComponent(new UiFolderWatcherManagerComponent(_this._gui, folderWatcherManager));
            }
        });
        //this._addUiComponent(new UiPluginManagerComponent(pluginManager));
    },
    // index database setup
    _startSearchClient: function (callback) {
        var internalCallback = callback || function () {
        };
        var searchStoreFactory = new SearchStoreFactory();
        var searchItemFactory = new SearchItemFactory();

        this._setSplashScreenStatus('startSearchDatabase');

        var searchClient = new SearchClient(this._getMainConfig(['app', 'search']), this.getAppQuitHandler(), 'mainIndex', searchStoreFactory, searchItemFactory, {
            onOpenCallback: function (err) {
                if (err)
                    logger.error(err.message);
                return internalCallback(searchClient);
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
        var _this = this;
        if (!this._environmentConfig.get('environment.startUi')) {
            return;
        }

        this._setSplashScreenStatus('startUi');

        this._addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));
        var openPortsConfig = this._getMainConfig(['app', 'net']);

        this._addUiComponent(new UiOpenPortsComponent(this._getJSONStateHandlerFactory().create(path.join(openPortsConfig.get('app.dataPath'), openPortsConfig.get('net.myOpenPortsStateConfig')))));

        var uiManager = new UiManager(this._getMainConfig(['ui']), this.getAppQuitHandler(), this._uiComponents);

        if (this._splashScreen) {
            this._splashScreen.once('close', function () {
                _this._checkUiRoutines();

                setImmediate(function () {
                    _this._checkForUpdates();
                });
            });
        }
    },
    _checkAndStartUi: function (component) {
        var readyToTakeOff = true;

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
        logger.log('checking ui routines');
        var uiRoutinesManager = new UiRoutinesManager(this._gui);
        uiRoutinesManager.addUiRoutine(new UiChromeExtensionRoutine(new JSONConfig('../../config/uiChromeExtensionRoutine.json', ['extension'])));

        uiRoutinesManager.getInstalledRoutineIds(function (err, routineIds) {
            if (!routineIds || !routineIds.length) {
                uiRoutinesManager.open();
                logger.log('ui routines: opened manager');
            } else {
                uiRoutinesManager.getUiRoutine(routineIds[0]).start();
            }
        });
    },
    _startTopology: function (searchMessageBridge, downloadBridge, uploadBridge) {
        var _this = this;
        if (!this._environmentConfig.get('environment.startTopology')) {
            this._checkAndStartUi('topology');

            if (this._splashScreen) {
                setImmediate(function () {
                    logger.log('closing splashscreen');
                    _this._splashScreen.close();
                });
            }

            return;
        }

        this._setSplashScreenStatus('startTopology');

        var appConfig = this._getMainConfig('app');
        var topologyConfig = this._getMainConfig('topology');

        var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
        var jsonWebIp = new JSONWebIp();
        var nodeAddressFactory = new ContactNodeAddressFactory();
        var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, this._getMainConfig(['app', 'net']), this._getJSONStateHandlerFactory(), [jsonWebIp]);
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

            var idState = _this._getJSONStateHandlerFactory().create(path.resolve(_this.getDataPath(), 'myId.json'));

            idState.load(function (err, state) {
                if (err)
                    logger.error('Id state error', { emsg: err.message });
                var myId = null;

                if (state && state.id) {
                    myId = new Id(Id.byteBufferByHexString(state.id, 20), 160);
                } else {
                    state = {};
                    var randBuffer = crypto.randomBytes(20);
                    state.id = randBuffer.toString('hex');
                    idState.save(state, function () {
                    });

                    myId = new Id(randBuffer, 160);
                }

                logger.log('topology', 'My ID is: ' + myId.toHexString());

                myNode = new MyNode(myId, addressList);

                //bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
                bucketStore = new ObjectBucketStore('objectBucketStore', path.join(appConfig.get('app.dataPath'), topologyConfig.get('topology.bucketStore.databasePath')), 2);
                bucketFactory = new BucketFactory();
                contactNodeFactory = new ContactNodeFactory();
                routingTable = new RoutingTable(topologyConfig, _this.getAppQuitHandler(), myId, bucketFactory, bucketStore, contactNodeFactory, {
                    onOpenCallback: function (err) {
                        if (err) {
                            logger.error(err.message);
                        }

                        protocolGateway = new ProtocolGateway(appConfig, _this._getMainConfig('protocol'), topologyConfig, _this._getMainConfig('hydra'), _this._getMainConfig('fileTransfer'), myNode, tcpSocketHandler, routingTable, searchMessageBridge, downloadBridge, uploadBridge);

                        _this._addUiComponent(new UiProtocolGatewayComponent(protocolGateway, _this._splashScreen));
                        _this._checkAndStartUi('topology');

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
