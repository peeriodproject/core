/// <reference path='../../../test.d.ts' />

require('should');

import WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> WritableFileTransferMessageFactory', function () {

	var factory = new WritableFileTransferMessageFactory();

	it('should correctly format the message', function () {
		var expected = Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0x01]), new Buffer('foobar')]);

		var actual = factory.constructMessage('cafebabecafebabecafebabecafebabe', 'TRANSFER_QUERY', new Buffer('foobar'));

		actual.length.should.equal(expected.length);

		for (var i=0; i<actual.length; i++) {
			actual[i].should.equal(expected[i]);
		}
	});

	it('should throw the errors', function () {
		(function () {
			factory.constructMessage('cafebabe', 'TRANSFER_QUERY', new Buffer('foobar'));
		}).should.throw();

		(function () {
			factory.constructMessage('cafebabecafebabecafebabecafebabe', 'FOOBAR', new Buffer('foobar'));
		}).should.throw();
	});

});