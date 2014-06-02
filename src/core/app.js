var JSONConfig = require('./config/JSONConfig');
var TCPSocketHandlerFactory = require('./net/tcp/TCPSocketHandlerFactory');
var NetworkBootstrapper = require('./net/NetworkBootstrapper');
var FreeGeoIp = require('./net/ip/FreeGeoIp');
var Id = require('./topology/Id');
var MyNode = require('./topology/MyNode');
var ContactNodeAddressFactory = require('./topology/ContactNodeAddressFactory');

var BucketFactory = require('./topology/BucketFactory');
var BucketStore = require('./topology/BucketStore');
var ContactNodeFactory = require('./topology/ContactNodeFactory');
var RoutingTable = require('./topology/RoutingTable');

var crypto = require('crypto');
var ProtocolGateway = require('./protocol/ProtocolGateway');

var logger = require('./utils/logger/LoggerFactory').create();

var App = {
    start: function () {
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var netConfig = new JSONConfig('../../config/mainConfig.json', ['net']);
        var protocolConfig = new JSONConfig('../../config/mainConfig.json', ['protocol']);
        var topologyConfig = new JSONConfig('../../config/mainConfig.json', ['topology']);

        var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
        var freeGeoIp = new FreeGeoIp();

        var nodeAddressFactory = new ContactNodeAddressFactory();

        var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, netConfig, [freeGeoIp]);

        var protocolGateway = null;

        networkBootstrapper.bootstrap(function (err) {
            if (err) {
                logger.error('Network Bootstrapper: ERROR');
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

            console.log('bootstrapped the network');

            for (var i = 0; i < myOpenPorts.length; i++) {
                addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
            }

            // switch on ports for id
            var myId = new Id(crypto.randomBytes(20), 160);

            console.log('My ID is: ' + myId.toHexString());

            myNode = new MyNode(myId, addressList);

            bucketStore = new BucketStore('foo', topologyConfig.get('topology.bucketStore.databasePath'));
            bucketFactory = new BucketFactory();
            contactNodeFactory = new ContactNodeFactory();
            routingTable = new RoutingTable(topologyConfig, myId, bucketFactory, bucketStore, contactNodeFactory);

            protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, myNode, tcpSocketHandler, routingTable);

            logger.info('Initial setup done, joining the network.');

            protocolGateway.start();
        });
    }
};

module.exports = App;
//# sourceMappingURL=app.js.map
