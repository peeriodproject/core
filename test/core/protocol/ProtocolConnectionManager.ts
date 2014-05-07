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

import ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');


describe('CORE --> PROTOCOL --> NET --> ProtocolConnectionManager @current', function () {

	var sandbox:SinonSandbox;
	var configStub:any;
	var tcpSocketHandler:TCPSocketHandler;
	var remoteServer:net.Server;

	var handler_built:boolean = false;
	var server_built:boolean = false;


	var handlerOpts:TCPSocketHandlerOptions = {
		allowHalfOpenSockets:false,
		myExternalIp:'127.0.0.1',
		myOpenPorts:[60000],
		doKeepAlive: true,
		idleConnectionKillTimeout: 1
	};

	var tcpSocketFactory:TCPSocketFactory = new TCPSocketFactory();

	before(function (done) {

		sandbox = sinon.sandbox.create();

		// build our config
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'protocol.messages.maxByteLengthPerMessage') return 1024 * 1024;
				if (key === 'prococol.messages.msToKeepNonAddressableMemory') return 2000;
				if (key === 'prococol.net.msToWaitForIncomingMessage') return 1000;
				if (key === 'protocol.net.maxSecondsToWaitForConnection') return 1000;
			}
		});

		remoteServer = net.createServer();
		remoteServer.listen(60001);
		remoteServer.on('listening', function () {
			server_built = true;
			if (server_built && handler_built) done();
		});

		// build our tcp socket handler
		tcpSocketHandler = new TCPSocketHandler(tcpSocketFactory, handlerOpts);

		tcpSocketHandler.autoBootstrap(function (openPorts:Array<number>) {
			if (openPorts[0] === 60000) {
				handler_built = true;
				if (server_built && handler_built) done();
			}
		});
	});

	after(function () {
		sandbox.restore();
	});

	// ------- TESTS -------

	it('test', function (done) {
		if (true === true) done();
	});


})