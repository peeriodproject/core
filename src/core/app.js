var JSONConfig = require('./config/JSONConfig');
var TCPSocketHandlerFactory = require('./net/tcp/TCPSocketHandlerFactory');
var NetworkBootstrapper = require('./net/NetworkBootstrapper');
var FreeGeoIp = require('./net/ip/FreeGeoIp');
var Id = require('./topology/Id');
var MyNode = require('./topology/MyNode');
var ContactNodeAddressFactory = require('./topology/ContactNodeAddressFactory');
var ContactNodeAddress = require('./topology/ContactNodeAddress');
var ContactNode = require('./topology/ContactNode');
var ProtocolConnectionManager = require('./protocol/net/ProtocolConnectionManager');
var GeneralWritableMessageFactory = require('./protocol/messages/GeneralWritableMessageFactory');

var App = {
    start: function () {
        var netConfig = new JSONConfig('../../config/mainConfig.json', ['net']);
        var protocolConfig = new JSONConfig('../../config/mainConfig.json', ['protocol']);
        var topologyConfig = new JSONConfig('../../config/mainConfig.json', ['topology']);

        var tcpSocketHandlerFactory = new TCPSocketHandlerFactory();
        var freeGeoIp = new FreeGeoIp();

        var nodeAddressFactory = new ContactNodeAddressFactory();

        var networkBootstrapper = new NetworkBootstrapper(tcpSocketHandlerFactory, netConfig, [freeGeoIp]);

        networkBootstrapper.bootstrap(function (err) {
            if (err) {
                console.log('Network Bootstrapper: ERROR');
                return;
            }

            // build up our node
            var myIp = networkBootstrapper.getExternalIp();
            var tcpSocketHandler = networkBootstrapper.getTCPSocketHandler();
            var myOpenPorts = tcpSocketHandler.getOpenServerPortsArray();
            var addressList = [];

            var myNode = null;
            var protocolConnectionManager = null;
            var generalWritableMessageFactory = null;
            var bucketStore = null;
            var bucketFactory = null;
            var contactNodeFactory = null;
            var routingTable = null;

            if (myOpenPorts.length === 0) {
                console.log('NO PORTS OPEN. ERROR');
                return;
            }

            console.log('bootstrapped the network');

            for (var i = 0; i < myOpenPorts.length; i++) {
                addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
            }

            // switch on ports for id
            var hexVal = myOpenPorts[0] === 30415 ? '0020000000000000009400010100000050f40602' : '0a0000000000000078f406020100000005000000';
            var myId = new Id(Id.byteBufferByHexString(hexVal, 20), 160);

            myNode = new MyNode(myId, addressList);
            protocolConnectionManager = new ProtocolConnectionManager(protocolConfig, tcpSocketHandler);
            generalWritableMessageFactory = new GeneralWritableMessageFactory(myNode);

            //bucketStore = new BucketStore('foo', topologyConfig.get('topology.bucketStore.databasePath'));
            //bucketFactory = new BucketFactory();
            //contactNodeFactory = new ContactNodeFactory();
            //routingTable = new RoutingTable(topologyConfig, myId, bucketFactory, bucketStore, contactNodeFactory);
            if (myOpenPorts[0] === 30415) {
                console.log('In Port 30415.');

                // initializer
                var remoteNodeId = new Id(Id.byteBufferByHexString('0a0000000000000078f406020100000005000000', 20), 160);
                var remoteContact = new ContactNode(remoteNodeId, [new ContactNodeAddress(myIp, 50385)], Date.now());

                generalWritableMessageFactory.setReceiver(remoteContact);
                generalWritableMessageFactory.setMessageType('PING');
                var buf = generalWritableMessageFactory.constructMessage(new Buffer(0));

                protocolConnectionManager.writeBufferTo(remoteContact, buf);

                protocolConnectionManager.on('message', function (message) {
                    console.log('Message from ' + message.getSender().getId().toHexString() + ': ' + message.getMessageType());
                });
            } else {
                console.log('In Port 50385.');
                protocolConnectionManager.on('message', function (message) {
                    if (message.getMessageType() === 'PING') {
                        console.log('Message from ' + message.getSender().getId().toHexString() + ': ' + message.getMessageType());
                        generalWritableMessageFactory.setReceiver(message.getSender());
                        generalWritableMessageFactory.setMessageType('PING');
                        var buf = generalWritableMessageFactory.constructMessage(new Buffer(0));

                        protocolConnectionManager.writeBufferTo(message.getSender(), buf);
                    }
                });
            }

            console.log('everything set up!');
        });
    }
};

module.exports = App;
//# sourceMappingURL=app.js.map
