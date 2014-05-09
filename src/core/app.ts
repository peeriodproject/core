import JSONConfig = require('./config/JSONConfig');
import TCPSocketHandlerFactory = require('./net/tcp/TCPSocketHandlerFactory');
import NetworkBootstrapper = require('./net/NetworkBootstrapper');
import FreeGeoIp = require('./net/ip/FreeGeoIp');
import Id = require('./topology/Id');
import MyNode = require('./topology/MyNode');
import ContactNodeAddressFactory = require('./topology/ContactNodeAddressFactory');
import ContactNodeAddress = require('./topology/ContactNodeAddress');
import ContactNode = require('./topology/ContactNode');
import ProtocolConnectionManager = require('./protocol/net/ProtocolConnectionManager');
import GeneralWritableMessageFactory = require('./protocol/messages/GeneralWritableMessageFactory');
import BucketFactory = require('./topology/BucketFactory');
import BucketStore = require('./topology/BucketStore');
import ContactNodeFactory = require('./topology/ContactNodeFactory');
import RoutingTable = require('./topology/RoutingTable');
import ReadableMessage = require('./protocol/messages/ReadableMessage');



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
			var myOpenPorts:Array<number> = tcpSocketHandler.getOpenServerPortsArray();
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

			for (var i=0; i<myOpenPorts.length; i++) {
				addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
			}

			// switch on ports for id
			var hexVal = myOpenPorts[0] === 30415 ? '0020000000000000009400010100000050f40602' : '0a0000000000000078f406020100000005000000';
			var myId:Id = new Id(Id.byteBufferByHexString(hexVal, 20), 160);


			myNode = new MyNode(myId, addressList);
			protocolConnectionManager = new ProtocolConnectionManager(protocolConfig, tcpSocketHandler);
			generalWritableMessageFactory = new GeneralWritableMessageFactory(myNode);
			//bucketStore = new BucketStore('foo', topologyConfig.get('topology.bucketStore.databasePath'));
			//bucketFactory = new BucketFactory();
			//contactNodeFactory = new ContactNodeFactory();
			//routingTable = new RoutingTable(topologyConfig, myId, bucketFactory, bucketStore, contactNodeFactory);

			if (myOpenPorts[0] === 30415) {
				console.log('In Port 30415. johnny');
				// initializer
				var remoteNodeId = new Id(Id.byteBufferByHexString('0a0000000000000078f406020100000005000000', 20), 160);
				var remoteContact = new ContactNode(remoteNodeId, [new ContactNodeAddress(myIp, 30414)], Date.now());

				generalWritableMessageFactory.setReceiver(remoteContact);
				generalWritableMessageFactory.setMessageType('PING');
				var buf = generalWritableMessageFactory.constructMessage(new Buffer(0));

				protocolConnectionManager.writeBufferTo(remoteContact, buf);

				protocolConnectionManager.on('message', function (message:ReadableMessage) {
					console.log('Message from ' + message.getSender().getId().toHexString() + ': ' + message.getMessageType());
				});

			}
			else {
				console.log('In Port 30414. joern');
				protocolConnectionManager.on('message', function (message:ReadableMessage) {
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
}

export = App;