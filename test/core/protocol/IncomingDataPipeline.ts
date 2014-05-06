/// <reference path='../../test.d.ts' />

import net = require('net');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import IncomingDataPipelineInterface = require('../../../src/core/protocol/messages/interfaces/IncomingDataPipelineInterface');
import IncomingDataPipeline = require('../../../src/core/protocol/messages/IncomingDataPipeline');
import TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
import ReadableMessageFactory = require('../../../src/core/protocol/messages/ReadableMessageFactory');
import ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');

describe('CORE --> PROTOCOL --> IncomingDataPipeline @current', function () {

	var sandbox:SinonSandbox;
	var readableMessageFactoryStub:any;
	var server:net.Server = null;
	var currentConnection:net.Socket = null;
	var tcpSock:TCPSocket = null;

	var pipe:IncomingDataPipeline = null;

	var maxByteLength = 1024 * 1024;
	var messageEndBytes = [0x50, 0x52, 0x44, 0x45, 0x4e, 0x44];

	var sockOpts = {doKeepAlive: true, idleConnectionKillTimeout: 0};


	// we use a null byte at the beginning to indicate that a message cannot be parsed.

	before(function () {
		sandbox = sinon.sandbox.create();

		// build up readable message factory stub
		readableMessageFactoryStub = testUtils.stubPublicApi(sandbox, ReadableMessageFactory, {
			"create": function (buffer:Buffer) {
				if (buffer[0] === 0x00) throw new Error('Message not readable yo.');
				var foo:any = 'foobar';
				return foo;
			}
		});

		// build up our server
		server = net.createServer(function (socket) {
			currentConnection = socket;
		});

		server.listen(66666);

		pipe = new IncomingDataPipeline(maxByteLength, messageEndBytes, readableMessageFactoryStub);

	});

	it('should throw an error when hooking a socket without an identifer', function (done) {
		var sock = net.createConnection(66666, 'localhost', function () {
			var tcpSock = new TCPSocket(sock, sockOpts);
			try {
				pipe.hookSocket(tcpSock);
			} catch (e) {
				tcpSock.end();
				if (e.message === 'IncomingDataPipeline#hookSocket: Can only hook sockets with identifier') done();
			}
		});
	});

	it ('should correctly hook a socket to the pipeline', function (done) {
		var sock = net.createConnection(66666, 'localhost', function () {
			tcpSock = new TCPSocket(sock, sockOpts);
			tcpSock.setIdentifier('mySock');
			pipe.hookSocket(tcpSock);
			var hook = pipe.getSocketHookByIdentifier('mySock');
			if (hook !== undefined && typeof hook === 'function') done();
		});
	});

	it('should emit a message event with a complete message', function (done) {
		var msg = new Buffer([0x01, 0x02, 0x03, 0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]);

		pipe.once('message', function (identifier, msg) {
			if (msg === 'foobar') {
				done();
			}
		});

		currentConnection.write(msg);
	});

	it('should not be able to read the message', function (done) {
		var msg = new Buffer([0x00, 0x02, 0x03, 0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]);

		pipe.once('unreadableMessage', function (identifier) {
			done();
		});

		currentConnection.write(msg);
	});

	it('should be able to finalize data with end bytes split', function (done) {
		var msg1 = new Buffer([0x01]);
		var msg2 = new Buffer([0x02, 0x03, 0x50, 0x52, 0x44, 0x45]);
		var msg3 = new Buffer([0x4e, 0x44]);

		pipe.once('message', function (identifier, message) {
			if (message === 'foobar') done();
		});

		setTimeout(function () {
			currentConnection.write(msg1);
		}, 20);

		setTimeout(function () {
			currentConnection.write(msg2);
		}, 40);

		setTimeout(function () {
			currentConnection.write(msg3);
		}, 60);

	});

	it('should be able to finalize large data', function (done) {
		var len = maxByteLength;
		var largeBuffer = new Buffer(len);

		largeBuffer.fill(1);
		for (var i=0; i<6; i++) {
			largeBuffer[len - 1 - i] = messageEndBytes[5 - i];
		}

		pipe.once('message', function (identifier, message) {
			if (message === 'foobar') done();
		});

		currentConnection.write(largeBuffer);

	});

	it('should free memory when the limit has exceeded', function (done) {
		var largeBuffer = new Buffer(maxByteLength + 1);
		largeBuffer.fill(1);

		currentConnection.write(largeBuffer, function () {
			// give a second of time
			setTimeout(function () {
				if (pipe.getTemporaryMemoryByIdentifier('mySock') === undefined) done();
			}, 1000);
		});

	});

	it('should correctly handle things on identifier change', function (done) {
		var buf = new Buffer([0x01]);

		currentConnection.write(buf);

		setTimeout(function () {
			tcpSock.setIdentifier('mySockB');
			if (pipe.getSocketHookByIdentifier('mySockB') !== undefined && pipe.getTemporaryMemoryByIdentifier('mySockB').data[0][0] === 0x01) done();
		}, 20);
	});

	it('should return false when unhooking a non-existant socket', function () {
		pipe.unhookSocket(undefined).should.be.false;
	});

	it('should unhook a TCP socket from the pipe', function (done) {
		if (pipe.unhookSocket(tcpSock) && pipe.getSocketHookByIdentifier('mySockB') === undefined) {
			if (tcpSock.listeners('data').length === 0) done();
		}
	});

	after(function () {
		sandbox.restore();
		server.close();
	});



});