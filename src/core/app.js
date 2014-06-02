var path = require('path');

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

var JSONStateHandlerFactory = require('./utils/JSONStateHandlerFactory');

var stackTrace = require('stack-trace');

var logger = require('./utils/logger/LoggerFactory').create();

//require('longjohn');
var App = {
    start: function (dataPath) {
        var appConfig = new JSONConfig('../../config/mainConfig.json', ['app']);
        var netConfig = new JSONConfig('../../config/mainConfig.json', ['net']);
        var protocolConfig = new JSONConfig('../../config/mainConfig.json', ['protocol']);
        var topologyConfig = new JSONConfig('../../config/mainConfig.json', ['topology']);

        var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
        var freeGeoIp = new FreeGeoIp();

        var nodeAddressFactory = new ContactNodeAddressFactory();

        var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, netConfig, [freeGeoIp]);

        var protocolGateway = null;

        process.on('uncaughtException', function (err) {
            var trace = stackTrace.parse(err);
            logger.error({
                code: err.message, stack: err.stack, trace: {
                    typeName: trace.getTypeName(),
                    fnName: trace.getFunctionName(),
                    fileName: trace.getFileName(),
                    line: trace.getLineNumber()
                }
            });
            process.exit(1);
        });

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

                console.log('My ID is: ' + myId.toHexString());

                myNode = new MyNode(myId, addressList);

                bucketStore = new BucketStore('foo', topologyConfig.get('topology.bucketStore.databasePath'));
                bucketFactory = new BucketFactory();
                contactNodeFactory = new ContactNodeFactory();
                routingTable = new RoutingTable(topologyConfig, myId, bucketFactory, bucketStore, contactNodeFactory);

                protocolGateway = new ProtocolGateway(appConfig, protocolConfig, topologyConfig, myNode, tcpSocketHandler, routingTable);

                protocolGateway.start();
            });
        });
    }
};

module.exports = App;
//# sourceMappingURL=app.js.map
