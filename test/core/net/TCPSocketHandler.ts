/// <reference path='../../test.d.ts' />

require('should');


import TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
import TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
import TCPSocketHandlerOptions = require('../../../src/core/net/tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketOptions = require('../../../src/core/net/tcp/interfaces/TCPSocketOptions');

var events = require('events');
var net = require('net');

var defaultHandlerOpts:TCPSocketHandlerOptions = {
	myExternalIp: '127.0.0.1',
	idleConnectionKillTimeout: 0
};

describe('CORE --> NET --> TCP --> TCP SOCKET HANDLER', function () {

	var handler_a = new TCPSocketHandler(defaultHandlerOpts),
		server = handler_a.createTCPServer();

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

	it('should successfully create a bootstrapped tcp server', function (done) {
		handler_a.setMyExternalIp('127.0.0.1');
		handler_a.createTCPServerAndBootstrap(55556);
		handler_a.on('opened server', function (port, server) {
			if (port === 55556 && handler_a.getOpenServerPortsArray().indexOf(55556) >= 0) done();
			handler_a.removeAllListeners('opened server');
		});
	});

	it('should create a server on a used port, close the server, and successfully retry', function (done) {
		server.listen(55555);
		server.on('listening', function () {

			var serverB = handler_a.createTCPServerAndBootstrap(55555);
			serverB.on('error', function (error) {
				if (error.code == 'EADDRINUSE') {
					server.close();
				}
			});
			handler_a.on('opened server', function (port, server) {
				if (port === 55555) done();
				handler_a.removeAllListeners('opened server');
			});
		});
	});

	it('should finally nicely auto bootstrap a TCP handler with all servers', function (done) {
		defaultHandlerOpts.myOpenPorts = [55555, 55557, 55558];
		var handler_b = new TCPSocketHandler(defaultHandlerOpts);
		handler_b.autoBootstrap(function (openPorts) {
			var expected = [55557, 55558],
				success = true;

			expected.forEach(function (expectedPort) {
				if (openPorts.indexOf(expectedPort) < 0) success = false;
			});

			if (success) done();
		});
	});



});