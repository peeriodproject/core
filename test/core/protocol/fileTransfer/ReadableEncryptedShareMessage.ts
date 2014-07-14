/// <reference path='../../../test.d.ts' />

require('should');

import ReadableEncryptedShareMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableEncryptedShareMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ReadableEncryptedShareMessage', function () {

	it('should correctly deformat the message', function () {
		var msg = new ReadableEncryptedShareMessage(Buffer.concat([new Buffer([0x01]), new Buffer('foobar')]));

		msg.getMessageType().should.equal('SHARE_ABORT');
		msg.getPayload().toString().should.equal('foobar');
	});

	it('should throw an error when the indicator byte is unknown', function () {
		(function () {
			new ReadableEncryptedShareMessage(Buffer.concat([new Buffer([0xff]), new Buffer('foobar')]));
		}).should.throw('ReadableEncryptedShareMessage: Unknown message type');
	})

});