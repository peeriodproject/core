var crypto = require('crypto');
var path = require('path');
var fs = require('fs-extra');

// global imports
var JSONConfig = require('./config/JSONConfig');
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
var SearchFormManager = require('./search/SearchFormManager');

var PluginFinder = require('./plugin/PluginFinder');
var PluginValidator = require('./plugin/PluginValidator');
var PluginLoaderFactory = require('./plugin/PluginLoaderFactory');
var PluginRunnerFactory = require('./plugin/PluginRunnerFactory');
var PluginManager = require('./plugin/PluginManager');

var FolderWatcherFactory = require('./fs/FolderWatcherFactory');
var FolderWatcherManager = require('./fs/FolderWatcherManager');
var PathValidator = require('./fs/PathValidator');

var IndexManager = require('./search/IndexManager');

// ui imports
var UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
var UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');

var UiManager = require('./ui/UiManager');

// Testing purposes only
var nameFixtures = require('../config/nameFixtures');

var App = {
    appQuitHandler: null,
    _gui: null,
    _uiComponents: [],
    _requestManager: null,
    _responseManager: null,
    _queryInterval: null,
    addUiComponent: function (component) {
        this._uiComponents.push(component);
    },
    start: function (gui, nwApp, dataPath, win) {
        var _this = this;
        win.showDevTools();

        this._gui = gui;
        this.appQuitHandler = new AppQuitHandler(nwApp);

        // copy node discovery.json to app data path
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var nodeDiscoveryPath = path.resolve(appConfig.get('app.dataPath'), 'nodeDiscovery.json');

        if (!fs.existsSync(nodeDiscoveryPath)) {
            fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
        }

        this.startSearchClient(function (searchConfig, searchClient) {
            var searchRequestManager = new SearchRequestManager(_this.appQuitHandler, 'searchrequests', searchClient);
            var searchResponseManager = new SearchResponseManager(_this.appQuitHandler, searchClient);

            /*searchResponseManager.onResultsFound((queryId:string, results:Buffer) => {
            });
            
            searchRequestManager.onQueryResultsChanged((queryId:string) => {
            });
            
            searchRequestManager.onQueryEnd((queryId:string, reason:string) => {
            });
            
            searchRequestManager.onQueryCanceled((queryId:string, reason:string) => {
            });*/
            var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

            if (!process.env.UI_ENABLED) {
                _this.startTopology(dataPath, searchMessageBridge);
            }

            _this.startIndexer(searchConfig, searchClient, searchRequestManager, searchResponseManager);

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
    startIndexer: function (searchConfig, searchClient, searchRequestManager, searchResponseManager) {
        var _this = this;
        var fsConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'fs']);
        var pluginConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'plugin']);
        var searchAppConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'search']);

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
        var searchFormManager;

        var pluginManager = new PluginManager(pluginConfig, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
                folderWatcherManager = new FolderWatcherManager(fsConfig, _this.appQuitHandler, stateHandlerFactory, folderWatcherFactory, {
                    onOpenCallback: function () {
                        indexManager = new IndexManager(searchConfig, _this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);
                        pluginManager.activatePluginState();

                        searchFormManager = new SearchFormManager(searchAppConfig, _this.appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager);

                        //this.addUiComponent(new UiSearchFormManagerComponent(searchFormManager, searchRequestManager));
                        console.log('started indexer');

                        if (process.env.UI_ENABLED) {
                            _this.startUi();
                        }
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
        var searchConfig = new JSONConfig('../../config/mainConfig.json', ['search']);

        var searchStoreFactory = new SearchStoreFactory();
        var searchItemFactory = new SearchItemFactory();
        var searchClient = new SearchClient(searchConfig, this.appQuitHandler, 'mainIndex', searchStoreFactory, searchItemFactory, {
            onOpenCallback: function () {
                return callback(searchConfig, searchClient);
            }
        });
    },
    startUi: function () {
        var uiConfig = new JSONConfig('../../config/mainConfig.json', ['ui']);

        this.addUiComponent(new UiFolderDropzoneComponent(this._gui.Window));

        var uiManager = new UiManager(uiConfig, this.appQuitHandler, this._uiComponents);
    },
    startTopology: function (dataPath, searchMessageBridge) {
        var _this = this;
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
            var idState = handlerFactory.create(path.resolve(dataPath, 'myId.json'));

            idState.load(function (err, state) {
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

                bucketStore = new BucketStore('bucketstore', topologyConfig.get('topology.bucketStore.databasePath'));
                bucketFactory = new BucketFactory();
                contactNodeFactory = new ContactNodeFactory();
                routingTable = new RoutingTable(topologyConfig, _this.appQuitHandler, myId, bucketFactory, bucketStore, contactNodeFactory, {
                    onOpenCallback: function (err) {
                        if (err) {
                            console.error(err);
                        }

                        protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, hydraConfig, transferConfig, myNode, tcpSocketHandler, routingTable, searchMessageBridge);

                        protocolGateway.start();

                        protocolGateway.once('readyToSearch', function () {
                            _this._queryInterval = setInterval(function () {
                                _this.startQuery();
                            }, 15000);
                        });
                    }
                });
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=App.js.map
