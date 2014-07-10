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
    _uiComponents: [],
    addUiComponent: function (component) {
        this._uiComponents.push(component);
    },
    start: function (gui, nwApp, dataPath, win) {
        var _this = this;
        win.showDevTools();

        this.appQuitHandler = new AppQuitHandler(nwApp);

        // copy node discovery.json to app data path
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var nodeDiscoveryPath = path.resolve(appConfig.get('app.dataPath'), 'nodeDiscovery.json');

        if (!fs.existsSync(nodeDiscoveryPath)) {
            fs.copySync(path.join(__dirname, '../config/nodeDiscovery.json'), nodeDiscoveryPath);
        }

        //this.startTopology(dataPath, win);
        this.startSearchClient(function (searchConfig, searchClient) {
            var searchRequestManager = new SearchRequestManager(_this.appQuitHandler, 'searchrequests', searchClient);
            var searchResponseManager = new SearchResponseManager(_this.appQuitHandler, searchClient);

            searchResponseManager.onResultsFound(function (identifier, results) {
                var result = results.toString();

                logger.log('query', 'Received query results', { result: result });
            });

            var searchMessageBridge = new SearchMessageBridge(searchRequestManager, searchResponseManager);

            _this.startTopology(dataPath, searchMessageBridge, searchRequestManager);
            _this.startIndexer(searchConfig, searchClient);

            console.log('started indexer');

            //this.startUi(gui);
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
        var _this = this;
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
            onOpenCallback: function () {
                // activate plugin state
                pluginManager.activatePluginState(function () {
                    searchManager = new SearchManager(searchConfig, pluginManager, searchClient);
                    folderWatcherManager = new FolderWatcherManager(fsConfig, _this.appQuitHandler, stateHandlerFactory, folderWatcherFactory);
                    indexManager = new IndexManager(searchConfig, _this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);

                    // register ui components
                    // ----------------------
                    _this.addUiComponent(new UiFolderWatcherManagerComponent(folderWatcherManager));
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
    startTopology: function (dataPath, searchMessageBridge, searchRequestManager) {
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
                            var i = Math.floor(Math.random() * nameFixtures.length);
                            var name = nameFixtures[i].name;

                            var queryBody = {
                                "query": {
                                    "match": {
                                        "file": name
                                    }
                                }
                            };

                            logger.log('query', 'Starting query', { name: name, id: myId.toHexString() });

                            searchRequestManager.addQuery(queryBody);
                        });
                    }
                });
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=app.js.map
