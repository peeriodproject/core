/// <reference path='../../test.d.ts' />

require('should');

var NetworkManager = require('../../../src/core/net/network').NetworkManager;
var events = require('events');

describe('CORE --> NET --> NETWORK MANAGER', function () {

	it('net manager should extend EventEmitter', function () {
		var netManager = new NetworkManager();
		netManager.should.be.instanceof(events.EventEmitter);
	});

});