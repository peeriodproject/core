import path = require('path');

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
import crypto = require('crypto');
import ProtocolGateway = require('./protocol/ProtocolGateway');

import JSONStateHandlerFactory = require('./utils/JSONStateHandlerFactory');

var logger = require('./utils/logger/LoggerFactory').create();

require('longjohn');


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
			logger.error({code: err.message, stack: err.stack });
		});

		networkBootstrapper.bootstrap(function (err) {
			if (err) {
				logger.error('Network Bootstrapper: ERROR');
				return;
			}

			// build up our node
			var myIp = networkBootstrapper.getExternalIp();
			var tcpSocketHandler = networkBootstrapper.getTCPSocketHandler();
			var myOpenPorts:Array<number> = tcpSocketHandler.getOpenServerPortsArray();
			var addressList = [];

			var myNode = null;

			var bucketStore = null;
			var bucketFactory = null;
			var contactNodeFactory = null;
			var routingTable = null;


			console.log('bootstrapped the network');

			for (var i=0; i<myOpenPorts.length; i++) {
				addressList.push(nodeAddressFactory.create(myIp, myOpenPorts[i]));
			}


			var handlerFactory = new JSONStateHandlerFactory();
			var idState = handlerFactory.create(path.resolve(dataPath, 'myId.json'));
			idState.load((err:Error, state:any) => {

				var myId = null;

				if (state && state.id) {
					myId = new Id(Id.byteBufferByHexString(state.id, 20), 160);
				}
				else {
					state = {};
					var randBuffer = crypto.randomBytes(20);
					state.id = randBuffer.toString('hex');
					idState.save(state, () => {
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
}

export = App;