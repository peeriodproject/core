/// <reference path='../../test.d.ts' />

require('should');

import BroadcastReadableMessage = require('../../../src/core/protocol/broadcast/messages/BroadcastReadableMessage');

describe('CORE --> PROTOCOL --> BROADCAST --> BroadcastReadableMessage', function () {

	it('should correctly deformat the message', function () {
		var expectedTimestamp = Date.now();
		var expectedPayload = new Buffer('muschimuschi');
		var id = new Buffer(16);

		var timestampBuffer = new Buffer(8);
		timestampBuffer.writeUInt32BE(Math.floor(expectedTimestamp / 1000), 0);
		timestampBuffer.writeUInt32BE(expectedTimestamp % 1000, 4);

		var broadcastMsg:Buffer = Buffer.concat([id, timestampBuffer, expectedPayload]);

		var msg = new BroadcastReadableMessage(broadcastMsg);

		msg.getPayload().toString().should.equal('muschimuschi');
		msg.getTimestamp().should.equal(expectedTimestamp);
		msg.getBroadcastId().should.equal(id.toString('hex'));
	});

	it('should throw an error when the message is too short or when the broadcast payload is empty', function () {
		(function () {
			new BroadcastReadableMessage(new Buffer(23));
		}).should.throw();

		(function () {
			new BroadcastReadableMessage(new Buffer(24));
		}).should.throw();
	});

});
