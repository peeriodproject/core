import net = require('net');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import IncomingDataPipeline = require('../../../src/core/protocol/messages/IncomingDataPipeline');
import TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
import TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');
import TCPSocketHandlerOptions = require('../../../src/core/net/tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
import ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

import ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');

import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import Id = require('../../../src/core/topology/Id');


describe('CORE --> PROTOCOL --> NET --> ProtocolConnectionManager @current', function () {

	var protoPort = 60000;
	var remotePort = 60001;

	var sandbox:SinonSandbox;
	var configStub:any;
	var tcpSocketHandler:TCPSocketHandler;
	var remoteServer:net.Server;

	var handler_built:boolean = false;
	var server_built:boolean = false;

	var manager:ProtocolConnectionManager;

	var addressFactory:ContactNodeAddressFactory = new ContactNodeAddressFactory();
	var nodeFactory:ContactNodeFactory = new ContactNodeFactory();

	var handlerOpts:TCPSocketHandlerOptions = {
		allowHalfOpenSockets:false,
		myExternalIp:'127.0.0.1',
		myOpenPorts:[protoPort],
		doKeepAlive: true,
		idleConnectionKillTimeout: 1.2,
		outboundConnectionTimeout: 500
	};

	var tcpSocketFactory:TCPSocketFactory = new TCPSocketFactory();

	before(function (done) {

		sandbox = sinon.sandbox.create();

		// build our config
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'protocol.messages.maxByteLengthPerMessage') return 1024 * 1024;
				if (key === 'protocol.messages.msToKeepNonAddressableMemory') return 2000;
				if (key === 'protocol.net.msToWaitForIncomingMessage') return 500;
				if (key === 'protocol.net.maxSecondsToWaitForConnection') return 2;
			}
		});

		remoteServer = net.createServer();
		remoteServer.listen(remotePort);
		remoteServer.on('listening', function () {
			server_built = true;
			if (server_built && handler_built) done();
		});

		// build our tcp socket handler
		tcpSocketHandler = new TCPSocketHandler(tcpSocketFactory, handlerOpts);

		tcpSocketHandler.autoBootstrap(function (openPorts:Array<number>) {
			if (openPorts[0] === protoPort) {
				manager = new ProtocolConnectionManager(configStub, tcpSocketHandler);
				handler_built = true;
				if (server_built && handler_built) done();
			}
		});
	});

	after(function () {
		sandbox.restore();
	});

	// ------- MESSAGES ----

	var createWorkingMessageA = function():Buffer {
		var begin = new Buffer([0x50, 0x52, 0x44, 0x42, 0x47, 0x4e]),
			end = new Buffer([0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]),
			// f3ec6b952992bb07f34862a411bb1f833f636288
			receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88 ]),
			// fe3626caca6c84fa4e5d323b6a26b897582c57f9
			senderId = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9 ]),
			// 127.0.0.1:60001
			ipv4Address = new Buffer([0x04, 127, 0, 0, 1, 0x17, 0x71]),

			addressEnd = new Buffer([0x05]),
			// PING
			messageType = new Buffer([0x50, 0x49]),
			// foobar
			payload = new Buffer('foobar', 'utf8'),

			list = [begin, receiverId, senderId, ipv4Address, addressEnd, messageType, payload, end];

		return Buffer.concat(list);
	};

	// ------- TESTS -------

	it('should correctly add a connection to the incoming pending list', function (done) {
		net.createConnection(protoPort, 'localhost');
		tcpSocketHandler.once('connected', function () {
			var item = manager.getIncomingPendingSocketList()['_temp1'];
			if (item && item.timeout) done();
		});

	});

	it('should correctly timeout kill the incoming pending socket', function (done) {
		var socket = manager.getIncomingPendingSocketList()['_temp1'].socket;

		socket.once('destroy', function () {
			if (manager.getIncomingPendingSocketList()['_temp1'] === undefined) {
				manager.removeAllListeners('terminatedConnection');
				done();
			}
		});

		manager.once('terminatedConnection', function () {
			throw new Error('Should not do that, nope nope.');
		});

	});

	it('should add the incoming socket to the confirmed sockets', function (done) {
		var message_a = createWorkingMessageA();
		manager.once('confirmedSocket', function (identifier) {
			if (Object.keys(manager.getIncomingPendingSocketList()).length === 0 && identifier === 'fe3626caca6c84fa4e5d323b6a26b897582c57f9') done();
		});

		var sock = net.createConnection(protoPort, 'localhost', function () {
			// is connected
			sock.write(message_a);
		});

	});

	it('should return the existing socket when connecting', function (done) {
		var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
		var existing = manager.getConfirmedSocketList()['fe3626caca6c84fa4e5d323b6a26b897582c57f9'].socket;

		manager.obtainConnectionTo(contactNode, function (err, socket) {
			if (socket && socket === existing) done();
		});

	});

	it('should keep the existing socket open', function (done) {
		var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
		manager.keepSocketsOpenFromNode(contactNode);
		var sock = manager.getConfirmedSocketByContactNode(contactNode);
		sock.once('destroy', function () {
			throw new Error('Should not happen, nope nope.');
		});
		setTimeout(function () {
			sock.removeAllListeners('destroy');
			done();
		}, 1500);

	});

	it('should no longer keep the existing socket open', function (done) {
		var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
		manager.keepSocketsNoLongerOpenFromNode(contactNode);
		manager.once('terminatedConnection', function (id) {
			if (id.toHexString() === 'fe3626caca6c84fa4e5d323b6a26b897582c57f9') {
				if (Object.keys(manager.getConfirmedSocketList()).length === 0) done();
			}
		});
	});

	it('should fail obtaining an outward connection to a node', function (done) {
		var id = new Id(Id.byteBufferByHexString('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 20), 160);
		var badContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111)]);

		manager.obtainConnectionTo(badContactNode, function (err, sock) {
			if (err && Object.keys(manager.getWaitForSocketList()).length === 0) done();
		});
	});

	it('should succeed obtaining an outward connection to a node on second try', function (done) {
		var id = new Id(Id.byteBufferByHexString('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 20), 160);
		var goodContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111),addressFactory.create('127.0.0.1', remotePort)]);

		manager.obtainConnectionTo(goodContactNode, function (err, socket) {
			if (socket && socket.getIdentifier() === 'fe3626caca6c84fa4e5d323b6a26b897582c57f9') {
				if (Object.keys(manager.getOutgoingPendingSocketList()).length === 0) {
					if (manager.getConfirmedSocketList()['fe3626caca6c84fa4e5d323b6a26b897582c57f9'].socket === socket) done();
				}
			}
		});
	});




})