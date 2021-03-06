/// <reference path='../../test.d.ts' />

require('should');

import BroadcastReadableMessage = require('../../../src/core/protocol/broadcast/messages/BroadcastReadableMessage');
import BroadcastWritableMessageFactory = require('../../../src/core/protocol/broadcast/messages/BroadcastWritableMessageFactory');

describe('CORE --> PROTOCOL --> BROADCAST --> BroadcastWritableMessageFactory', function () {

	it('should correctly format the broadcast message', function () {
		var factory = new BroadcastWritableMessageFactory();

		var msg = new BroadcastReadableMessage(factory.constructPayload('cafebabecafebabecafebabecafebabe', new Buffer('foobar')));

		msg.getBroadcastId().should.equal('cafebabecafebabecafebabecafebabe');
		msg.getPayload().toString().should.equal('foobar');
		(Date.now() - msg.getTimestamp()).should.be.below(50);
	});

	it('should throw an error when the broadcast ID has a bad length', function () {
		var factory = new BroadcastWritableMessageFactory();

		(function () {
			factory.constructPayload('cafebabe', new Buffer(19));
		}).should.throw();
	});

});