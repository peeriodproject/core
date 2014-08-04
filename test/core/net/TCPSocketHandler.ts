/// <reference path='../../test.d.ts' />

require('should');

import testUtils = require('../../utils/testUtils');

import TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
import TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
import TCPSocketHandlerOptions = require('../../../src/core/net/tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketOptions = require('../../../src/core/net/tcp/interfaces/TCPSocketOptions');
import TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');

var events = require('events');
var net = require('net');

var defaultHandlerOpts:TCPSocketHandlerOptions = {
	myExternalIp: '127.0.0.1',
	idleConnectionKillTimeout: 0,
	heartbeatTimeout: 0.5
};

describe('CORE --> NET --> TCP --> TCPSocketHandler', function () {

	this.timeout(0);

	var handler_a = new TCPSocketHandler(new TCPSocketFactory(), defaultHandlerOpts),
		server = handler_a.createTCPServer(),
		sandbox:SinonSandbox;


	it('should throw an error when creating handler with invalid IP', function () {
		var opts:TCPSocketHandlerOptions = {
			myExternalIp             : 'muschi',
			idleConnectionKillTimeout: 0,
			heartbeatTimeout: 0.5
		};
		(function () {
			new TCPSocketHandler(new TCPSocketFactory(), opts);
		}).should.throw('TCPHandler.constructor: Provided IP is no IP');
	});

	it('should have created a TCP server', function () {
		server.should.be.instanceof(net.Server);
	});

	it('should successfully connect to a TCP server and emit a `connected` event', function (done) {
		server.listen(55555);

		server.once('listening', function () {
			handler_a.connectTo(55555, '127.0.0.1');
			var connected_handle = function (socket) {
				if (socket.getIPPortString() == '127.0.0.1:55555') {
					socket.end();
					handler_a.removeListener('connected', connected_handle);
					done();
				}
			};

			handler_a.on('connected', connected_handle);
		});
	});

	it('should be reachable from outside', function (done) {
		handler_a.checkIfServerIsReachableFromOutside(server, function (success) {
			if (success) {
				done();
			}
		});
	});

	it('server should not be reachable and time out', function (done) {
		handler_a.setMyExternalIp('72.52.91.135');
		handler_a.checkIfServerIsReachableFromOutside(server, function (success) {
			if (!success) {
				done();
			}
		});
	});

	it('should fail when creating a bootstrapped tcp server which is not reachable', function (done) {
		handler_a.createTCPServerAndBootstrap(55556);
		handler_a.on('closedServer', function (port) {
			if (port === 55556) done();
		});
	});

	it('should successfully create a bootstrapped tcp server', function (done) {
		handler_a.setMyExternalIp('127.0.0.1');
		handler_a.createTCPServerAndBootstrap(55556);
		handler_a.on('openedReachableServer', function (port, server) {
			if (port === 55556 && handler_a.getOpenServerPortsArray().indexOf(55556) >= 0) done();
			handler_a.removeAllListeners('openedReachableServer');
		});
	});

	it('should create a server on a used port, close the server, and successfully retry', function (done) {
		server.listen(55555);
		server.on('listening', function () {

			var serverB = handler_a.createTCPServerAndBootstrap('55555');
			serverB.on('error', function (error) {
				if (error.code == 'EADDRINUSE') {
					server.close();
				}
			});
			handler_a.on('openedReachableServer', function (port, server) {
				handler_a.removeAllListeners('openedReachableServer');
				if (port === 55555) done();
			});
		});
	});

	it('should finally nicely auto bootstrap a TCP handler with all servers which can connected to', function (done) {
		defaultHandlerOpts.myOpenPorts = [55555, 55557, 55558];
		var handler_b = new TCPSocketHandler(new TCPSocketFactory(), defaultHandlerOpts);
		handler_b.autoBootstrap(function (openPorts) {
			var expected = [55557, 55558],
				success = true;

			expected.forEach(function (expectedPort) {
				if (openPorts.indexOf(expectedPort) < 0) success = false;
			});

			if (success) {
				net.createConnection(expected[0], defaultHandlerOpts.myExternalIp);
				handler_b.on('connected', function (socket) {
					handler_b.removeAllListeners('connected');
					done();
				});
			}
		});
	});

});