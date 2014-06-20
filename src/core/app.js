var crypto = require('crypto');
var path = require('path');

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

var PluginFinder = require('./plugin/PluginFinder');
var PluginValidator = require('./plugin/PluginValidator');
var PluginLoaderFactory = require('./plugin/PluginLoaderFactory');
var PluginRunnerFactory = require('./plugin/PluginRunnerFactory');
var PluginManager = require('./plugin/PluginManager');

var FolderWatcherFactory = require('./fs/FolderWatcherFactory');
var FolderWatcherManager = require('./fs/FolderWatcherManager');
var PathValidator = require('./fs/PathValidator');

// ui imports
var UiFolderWatcherManagerComponent = require('./ui/folder/UiFolderWatcherManagerComponent');
var UiFolderDropzoneComponent = require('./ui/folder/UiFolderDropzoneComponent');
var UiPluginManagerComponent = require('./ui/plugin/UiPluginManagerComponent');
var UiManager = require('./ui/UiManager');

var App = {
    appQuitHandler: null,
    _uiComponents: [],
    addUiComponent: function (component) {
        this._uiComponents.push(component);
    },
    start: function (gui, nwApp, dataPath, win) {
        this.appQuitHandler = new AppQuitHandler(nwApp);

        //this.startTopology(dataPath, win);
        this.startIndexer(dataPath, win);

        this.startUi(gui);
    },
    quit: function () {
        console.log('quitting...');
        return process.nextTick(function () {
            this.appQuitHandler.quit();
        }.bind(this));
    },
    startIndexer: function (dataPath, win) {
        win.showDevTools();

        //var testFolderPath:string = path.resolve(__dirname, '../../utils/TestFolder');
        //var externalFolderPath:string = path.resolve('/Volumes/External/path/Folder');
        var fsConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'fs']);
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var searchConfig = new JSONConfig('../../config/mainConfig.json', ['search']);
        var pluginConfig = new JSONConfig('../../config/mainConfig.json', ['app', 'plugin']);

        var searchStoreFactory = new SearchStoreFactory();
        var searchItemFactory = new SearchItemFactory();
        var searchClient = new SearchClient(searchConfig, this.appQuitHandler, 'mainIndex', searchStoreFactory, searchItemFactory);

        var pluginFinder = new PluginFinder(pluginConfig);
        var pluginValidator = new PluginValidator();
        var pluginLoaderFactory = new PluginLoaderFactory();
        var pluginRunnerFactory = new PluginRunnerFactory();

        var pluginManager = new PluginManager(pluginConfig, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory);

        var searchManager = new SearchManager(searchConfig, pluginManager, searchClient);

        var stateHandlerFactory = new JSONStateHandlerFactory();
        var folderWatcherFactory = new FolderWatcherFactory();

        var folderWatcherManager = new FolderWatcherManager(fsConfig, this.appQuitHandler, stateHandlerFactory, folderWatcherFactory);
        var pathValidator = new PathValidator();

        // ui components
        // ----------------------
        this.addUiComponent(new UiFolderWatcherManagerComponent(folderWatcherManager));
        this.addUiComponent(new UiPluginManagerComponent(pluginManager));
        //var indexManager = new IndexManager(searchConfig, this.appQuitHandler, folderWatcherManager, pathValidator, searchManager);
        // -----------------------
        //folderWatcherManager.addFolderWatcher(testFolderPath);
        //folderWatcherManager.addFolderWatcher(externalFolderPath);
    },
    startUi: function (gui) {
        var uiConfig = new JSONConfig('../../config/mainConfig.json', ['ui']);

        this.addUiComponent(new UiFolderDropzoneComponent(gui.Window));

        var uiManager = new UiManager(uiConfig, this.appQuitHandler, this._uiComponents);
    },
    startTopology: function (dataPath, win) {
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var netConfig = new JSONConfig('../../config/mainConfig.json', ['net']);
        var protocolConfig = new JSONConfig('../../config/mainConfig.json', ['protocol']);
        var topologyConfig = new JSONConfig('../../config/mainConfig.json', ['topology']);
        var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
        var jsonWebIp = new JSONWebIp();
        var nodeAddressFactory = new ContactNodeAddressFactory();
        var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, netConfig, [jsonWebIp]);
        var protocolGateway = null;

        networkBootstrapper.bootstrap(function (err) {
            var _this = this;
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

            logger.info('bootstrapped the network');

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

                logger.info('My ID is: ' + myId.toHexString());

                myNode = new MyNode(myId, addressList);

                bucketStore = new BucketStore('foo', topologyConfig.get('topology.bucketStore.databasePath'));
                bucketFactory = new BucketFactory();
                contactNodeFactory = new ContactNodeFactory();
                routingTable = new RoutingTable(topologyConfig, _this.appQuitHandler, myId, bucketFactory, bucketStore, contactNodeFactory);

                protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, myNode, tcpSocketHandler, routingTable);

                protocolGateway.start();
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=app.js.map
