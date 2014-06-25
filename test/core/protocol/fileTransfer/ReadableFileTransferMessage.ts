/// <reference path='../../../test.d.ts' />

require('should');

import ReadableFileTransferMessage = require('../../../../src/core/protocol/fileTransfer/messages/ReadableFileTransferMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ReadableFileTransferMessage', function () {

	it('should correctly deformat the message', function () {
		var buf = Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0x01]), new Buffer('foobar')]);

		var msg = new ReadableFileTransferMessage(buf);

		msg.getPayload().toString().should.equal('foobar');
		msg.getMessageType().should.equal('TRANSFER_QUERY');
		msg.getTransferId().should.equal('cafebabecafebabecafebabecafebabe');
	});

	it('should throw the errors', function () {
		(function () {
			new ReadableFileTransferMessage(Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0xff]), new Buffer('foobar')]));
		}).should.throw();

		(function () {
			new ReadableFileTransferMessage(Buffer.concat([new Buffer('cafebabecafebabecafebabecafebab', 'hex'), new Buffer([0x01])]));
		}).should.throw();
	});
});