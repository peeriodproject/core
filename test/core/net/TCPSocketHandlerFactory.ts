/// <reference path='../../test.d.ts' />

require('should');

import TCPSocketHandlerFactory = require('../../../src/core/net/tcp/TCPSocketHandlerFactory');
import TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
import TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');

describe('CORE --> TOPOLOGY --> TCPSocketHandlerFactory', function () {

	it ('should correctly create a tcp socket handler', function () {
		var handler = (new TCPSocketHandlerFactory()).create(new TCPSocketFactory(), {
			allowHalfOpenSockets:false,
			idleConnectionKillTimeout: 0,
			myExternalIp: '127.0.0.1'
		});
		handler.should.be.an.instanceof(TCPSocketHandler);
	});

});