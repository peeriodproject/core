/// <reference path='../../../test.d.ts' />

require('should');

import ReadableShareAbortMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareAbortMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ReadableShareAbortMessage', function () {

	var filename:string = 'This is a file.jpg';
	var filesize:number = 12345632434;
	var hash:string = '770606aff59bca0b045d8e0eaf5a7a7568bc1d39';

	it('should correctly deformat the message', function () {
		var buffer = Buffer.concat([new Buffer('00bc6120000001b2', 'hex'), new Buffer(hash, 'hex'), new Buffer(filename, 'utf8')]);

		var msg = new ReadableShareAbortMessage(buffer);

		msg.getFileHash().should.equal(hash);
		msg.getFilename().should.equal(filename);
		msg.getFilesize().should.equal(filesize);
	});

});