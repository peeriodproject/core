require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
import TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import MyNode = require('../../../src/core/topology/MyNode');
import ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
import ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
import Id = require('../../../src/core/topology/Id');
import ContactNode = require('../../../src/core/topology/ContactNode');
import RoutingTable = require('../../../src/core/topology/RoutingTable');

describe('CORE --> PROTOCOL --> PROXY --> ProxyManager @current', function () {

	this.timeout(0);

	var sandbox:SinonSandbox;

	var getRandomNode = function () {
		return undefined;
	};

	// okay, we have to build up 3 machines: 2 who can proxy, 1 who needs proxies.
	before(function (done) {
		sandbox = sinon.sandbox.create();

		var createProxyManager = function (openPort, hexString, callback):void {
			var tcpSocketHandlerOptions = {
				allowHalfOpenSockets:false,
				myExternalIp:'127.0.0.1',
				myOpenPorts: openPort ? [openPort] : [],
				doKeepAlive: true,
				idleConnectionKillTimeout: 1.2,
				outboundConnectionTimeout: 500
			};
			var tcpSocketHandler = new TCPSocketHandler(new TCPSocketFactory(), tcpSocketHandlerOptions);

			var protocolConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
				get: function (key) {
					if (key === 'protocol.messages.maxByteLengthPerMessage') return 1024 * 1024;
					if (key === 'protocol.messages.msToKeepNonAddressableMemory') return 2000;
					if (key === 'protocol.messages.msToWaitForIncomingMessage') return 500;
					if (key === 'protocol.messages.maxSecondsToWaitForConnection') return 2;

					if (key === 'protocol.proxy.maxNumberOfProxies') return 2;
					if (key === 'protocol.proxy.proxyForMaxNumberOfNodes') return 1;
					if (key === 'protocol.proxy.waitForNodeReactionInSeconds') return 1;
					if (key === 'protocol.proxy.maxUnsuccessfulProxyTries') return 1;
					if (key === 'protocol.proxy.unsuccessfulProxyTryWaitTimeInSeconds') return 1;
				}
			});

			var myNode = new MyNode(new Id(Id.byteBufferByHexString(hexString, 20), 160), null);

			var routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
				getRandomContactNode: function (callback) {
					callback(null, getRandomNode());
				}
			});

			tcpSocketHandler.autoBootstrap(function (openPorts:Array<number>) {
				if (openPort && (openPorts[0] === openPort)) {
					var protManager = new ProtocolConnectionManager(protocolConfigStub, myNode, tcpSocketHandler);
					var proxManager = new ProxyManager(protocolConfigStub, protManager, routingTableStub)
					callback(proxManager);
				}
			});
		};

	});

	after(function () {
		sandbox.restore();
	});


	/**
	 * -------------------- TESTS BEGIN
	 */


})