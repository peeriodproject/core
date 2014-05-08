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


describe('CORE --> PROTOCOL --> NET --> ProtocolConnectionManager', function () {

	this.timeout(0);

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

	var currentRemoteSocket:net.Socket;

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

	var createWorkingMessageB = function():Buffer {
		var begin = new Buffer([0x50, 0x52, 0x44, 0x42, 0x47, 0x4e]),
			end = new Buffer([0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]),
			// f3ec6b952992bb07f34862a411bb1f833f636288
			receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88 ]),
			// 1e3626caca6c84fa4e5d323b6a26b897582c57f9
			senderId = new Buffer([0x1e, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9 ]),
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

	it('should swap out the outgoing connection with the inbound connection', function (done) {
		var sock = net.createConnection(protoPort, 'localhost');
		tcpSocketHandler.once('connected', function () {
			manager.on('terminatedConnection', function () {
				throw new Error('Should definitely not do that, nope nope.');
			});
			manager.on('confirmedSocket', function (identifier, socket) {
				manager.removeAllListeners('terminatedConnection');
				if (manager.getConfirmedSocketList()[identifier].direction === 'incoming') {
					if (Object.keys(manager.getIncomingPendingSocketList()).length === 0) {
						if (Object.keys(manager.getOutgoingPendingSocketList()).length === 0) {
							done();
						}
					}
				}
			});
			sock.write(createWorkingMessageA());
		});
	});

	it('should prefer the incoming connection and close the outgoing pending at once when a connection has been established', function (done) {

		var ident = '1e3626caca6c84fa4e5d323b6a26b897582c57f9';
		var id = new Id(Id.byteBufferByHexString(ident, 20), 160);
		var goodContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111),addressFactory.create('127.0.0.1', remotePort)]);

		manager.obtainConnectionTo(goodContactNode, function (err, socket) {
			// check that is is inbound
			if (manager.getOutgoingPendingSocketList()[ident].closeAtOnce === true) {
				if (manager.getConfirmedSocketList()[ident].direction === 'incoming') {
					setTimeout(function () {
						if (Object.keys(manager.getOutgoingPendingSocketList()).length === 0) {
							manager.removeAllListeners('terminatedConnection');
							done();
						}
					}, 1000);
				}
			}
		});

		tcpSocketHandler.once('connected', function () {
			manager.on('terminatedConnection', function () {
				throw new Error('Should definitely not do that, nope nope.');
			});
			currentRemoteSocket.write(createWorkingMessageB());
		});
		currentRemoteSocket = net.createConnection(protoPort, 'localhost');
	});

	it('should destroy the connection when an incoming message does not match the identifier of the socket', function (done) {
		var ident = '1e3626caca6c84fa4e5d323b6a26b897582c57f9';
		manager.once('terminatedConnection', function (id) {
			if (id.toHexString() === ident  && manager.getConfirmedSocketList()[ident] === undefined) done();
		});

		currentRemoteSocket.write(createWorkingMessageA());
	});

	it('should obtain an outbound connection, write the buffer successfully and keep it open', function (done) {
		var ident = '1e3626caca6c84fa4e5d323b6a26b897582c57f9';
		var id = new Id(Id.byteBufferByHexString(ident, 20), 160);
		var goodContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111),addressFactory.create('127.0.0.1', remotePort)]);

		manager.keepSocketsOpenFromNode(goodContactNode);

		manager.writeBufferTo(goodContactNode, new Buffer([0x01]), function (err) {
			if (!err) {
				manager.getConfirmedSocketList()[ident].socket.on('close', function () {
					throw new Error('Should not happen, nope, nope');
				});
				setTimeout(function () {
					done();
				}, 1500)
			}
		});
	});

	it('should not change anything when keeping the same socket open', function () {
		var ident = '1e3626caca6c84fa4e5d323b6a26b897582c57f9';
		var id = new Id(Id.byteBufferByHexString(ident, 20), 160);
		var goodContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111),addressFactory.create('127.0.0.1', remotePort)]);
		manager.keepSocketsOpenFromNode(goodContactNode);
		var num = 0;
		var openList = manager.getKeepOpenList();
		for (var i=0; i<openList.length; i++) {
			if (openList[i] === ident) num++;
		}
		num.should.equal(1);
	});

	it('should error out when writing buffer to a connection it cannot establish', function (done) {
		var id = new Id(Id.byteBufferByHexString('0e3626caca6c84fa4e5d323b6a26b897582c57f9', 20), 160);
		var badContactNode = nodeFactory.create(id, [addressFactory.create('14.213.160.0', 1111)]);
		manager.writeBufferTo(badContactNode, new Buffer([0x01]), function (err) {
			if (err) {
				if (Object.keys(manager.getOutgoingPendingSocketList()).length === 0) done();
			}
		})
	});

	it('should return the correct confirmed socket', function () {
		var ident = '1e3626caca6c84fa4e5d323b6a26b897582c57f9';
		manager.getConfirmedSocketList()[ident].socket.should.equal(manager.getConfirmedSocketById(new Id(Id.byteBufferByHexString(ident, 20), 160)));
	});


})