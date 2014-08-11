var crypto = require('crypto');
var path = require('path');
var fs = require('fs-extra');

// global imports
var JSONConfig = require('./config/JSONConfig');

var i18n = require('i18n');
var logger = require('./utils/logger/LoggerFactory').create();

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
    _gui: null,
    _i18n: null,
    _splashScreen: null,
    _uiComponents: [],
    _requestManager: null,
    _responseManager: null,
    _started: [],
    _stateHandlerFactory: null,
    _queryInterval: null,
    addUiComponent: function (component) {
        this._uiComponents.push(component);
    },
    getStateHandlerFactory: function () {
        if (!this._stateHandlerFactory) {
            this._stateHandlerFactory = new JSONStateHandlerFactory();
        }

        return this._stateHandlerFactory;
    },
    setLocale: function (locale) {
        i18n.setLocale(locale);
    },
    start: function (gui, nwApp, dataPath, win) {
        var _this = this;
        win.showDevTools();

        this._gui = gui;
        this.appQuitHandler = new AppQuitHandler(nwApp);
        this._splashScreen = new UiSplashScreen(this._gui);

        // copy node discovery.json to app data path
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var nodeDiscoveryPath = path.resolve(appConfig.get('app.dataPath'), 'nodeDiscovery.json');

        if (!fs.existsSync(nodeDiscoveryPath)) {
            fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
        }

        this.startSearchClient(function (searchConfig, searchClient) {
            var searchRequestsIndexName = 'searchrequests';

            var searchRequestManager = new SearchRequestManager(_this.appQuitHandler, searchRequestsIndexName, searchClient);
            var searchResponseManager = new SearchResponseManager(_this.appQuitHandler, searchClient);

            var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

            _this.startIndexer(searchConfig, searchClient, searchRequestManager, searchResponseManager, function () {
                _this._started.push('indexer');
            });

            _this.startSharing(searchClient, searchRequestsIndexName, function (downloadManager, uploadManager) {
                _this._started.push('share');

                var downloadBridge = new DownloadBridge(downloadManager);
                var uploadBridge = new UploadBridge(uploadManager);

                // disables the network layer for testing purposes
                if (!process.env.DISABLE_TOPOLOGY) {
                    _this.startTopology(dataPath, searchMessageBridge, downloadBridge, uploadBridge);
                }
            });

            _this._requestManager = searchRequestManager;
            _this._responseManager = searchResponseManager;
        });
    },
    stopQueryInterval: function () {
        if (this._queryInterval) {
            clearInterval(this._queryInterval);
        }
    },
    startQuery: function () {
        var i = Math.floor(Math.random() * nameFixtures.length);
        var name = nameFixtures[i].name;

        //var name = "Vivamus";
        var queryBody = {
            "query": {
                "match": {
                    "itemName": name,
                    "file": name
                }
            },
            "highlight": {
                "fields": {
                    "itemName": {},
                    "file": {}
                }
            }
        };

        this._requestManager.addQuery(queryBody);
    },
    quit: function () {
        console.log('quitting...');
        return process.nextTick(function () {
            this.appQuitHandler.quit();
        }.bind(this));
    },
    startSharing: function (searchClient, searchRequestsIndexName, callback) {
        this._splashScreen.setStatus('startSharing');

        var shareConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'share']);
        var downloadManager = new DownloadManager(shareConfig, this.appQuitHandler, this.getStateHandlerFactory(), searchClient, searchRequestsIndexName);
        var uploadManager = new UploadManager(this.appQuitHandler, searchClient, searchRequestsIndexName);

        this.addUiComponent(new UiShareManagerComponent(downloadManager, uploadManager));

        return callback(downloadManager, uploadManager);
    },
    startIndexer: function (searchConfig, searchClient, searchRequestManager, searchResponseManager, callback) {
        var _this = this;
        this._splashScreen.setStatus('startIndexer');

        var fsConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'fs']);
        var pluginConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'plugin']);
        var searchAppConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'search']);

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
                folderWatcherManager = new FolderWatcherManager(fsConfig, _this.appQuitHandler, _this.getStateHandlerFactory(), folderWatcherFactory, {
                    onOpenCallback: function () {
                        indexManager = new IndexManager(searchConfig, _this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);
                        pluginManager.activatePluginState(function (err) {
                            if (err) {
                                logger.error(err);
                            }

                            searchFormResultsManager = new SearchFormResultsManager(searchAppConfig, _this.appQuitHandler, _this.getStateHandlerFactory(), pluginManager, searchRequestManager);
                            _this.addUiComponent(new UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager));

                            console.log('started indexer');

                            return callback();
                        });
                    }
                });

                // register ui components
                // ----------------------
                _this.addUiComponent(new UiFolderWatcherManagerComponent(_this._gui, folderWatcherManager));
                //});
            }
        });
        //this.addUiComponent(new UiPluginManagerComponent(pluginManager));
    },
    // index database setup
    startSearchClient: function (callback) {
        this._splashScreen.setStatus('startSearchDatabase');

        var searchConfig = new JSONConfig('../../config/mainConfig.json', ['search']);

        var searchStoreFactory = new SearchStoreFactory();
        var searchItemFactory = new SearchItemFactory();
        var searchClient = new SearchClient(searchConfig, this.appQuitHandler, 'mainIndex', searchStoreFactory, searchItemFactory, {
            onOpenCallback: function (err) {
                console.log(err);
                return callback(searchConfig, searchClient);
            }
        });
    },
    startUi: function () {
        var _this = this;
        // disables the UI for testing purposes
        if (!process.env.UI_ENABLED) {
            return;
        }

        console.log('started:', this._started);

        var dependencies = ['indexer', 'share'];
        var loaded = true;

        for (var i in dependencies) {
            if (this._started.indexOf(dependencies[i]) === -1) {
                loaded = false;
                break;
            }
        }

        if (!loaded) {
            return;
        }

        this._splashScreen.setStatus('startUi');

        var uiConfig = new JSONConfig('../../config/mainConfig.json', ['ui']);

        this.addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));

        var uiManager = new UiManager(uiConfig, this.appQuitHandler, this._uiComponents);

        this._splashScreen.once('close', function () {
            _this.checkUiRoutines();
        });
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
    startTopology: function (dataPath, searchMessageBridge, downloadBridge, uploadBridge) {
        var _this = this;
        this._splashScreen.setStatus('startTopology');

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

            var handlerFactory = new JSONStateHandlerFactory();
            console.log(path.resolve(dataPath, 'myId.json'));
            var idState = handlerFactory.create(path.resolve(dataPath, 'myId.json'));

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
                        /*protocolGateway.once('readyToSearch',  ()=> {
                        this._queryInterval = setInterval(() => {
                        this.startQuery();
                        }, 15000);
                        });*/
                    }
                });
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=App.js.map
