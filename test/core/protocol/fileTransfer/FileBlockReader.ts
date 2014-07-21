/// <reference path='../../../test.d.ts' />

require('should');

import fs = require('fs');
import crypto = require('crypto');
import testUtils = require('../../../utils/testUtils');

import FileBlockReader = require('../../../../src/core/protocol/fileTransfer/share/FileBlockReader');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> FileBlockReader', function () {

	var sha1Hash = '4dad5e4374038a14465f0c42fc150a36674b4bd8';
	var path = testUtils.getFixturePath('core/fileTransfer/snowden_brighton.jpg');
	var blockSize = 10000;
	var filesize = 517880;
	var pos = 0;

	it('should correctly read the contents of the file', function (done) {
		var reader = new FileBlockReader(path, blockSize);

		reader.prepareToRead(function (err) {
			if (err) throw err;

			var theBuff:Buffer = new Buffer(0);

			var readBlockAndAppend = function () {
				reader.readBlock(pos, function (err, readBytes) {
					if (err) throw err;

					theBuff = Buffer.concat([theBuff, readBytes]);
					pos = theBuff.length;

					if (pos === filesize) {
						var hash = crypto.createHash('sha1');
						hash.update(theBuff);
						hash.digest('hex').should.equal(sha1Hash);

						reader.abort(function () {
							done();
						});
					}
					else {
						readBlockAndAppend();
					}
				});
			};

			readBlockAndAppend();
		});
	});

	it('should callback with an error if preparing a file that does not exist', function (done) {
		var reader = new FileBlockReader(path + 'foo', blockSize);

		reader.prepareToRead(function (err) {
			(<any> err).code.should.equal('ENOENT');
			done();
		});
	});

	it('should correctly open and abort a file reader, then callback with an error when aborting again', function (done) {
		var reader = new FileBlockReader(path, blockSize);

		reader.prepareToRead(function (err) {
			if (err) throw err;

			reader.canBeRead().should.be.true;

			reader.abort(function (err) {
				(err === null).should.be.true;

				reader.abort(function (err) {
					err.message.should.equal('FileBlockReader: Cannot abort closed file block reader');
					done();
				});
			});
		});
	});

	it('should callback with an error if trying to read a non-open file', function (done) {
		var reader = new FileBlockReader(path, blockSize);

		reader.readBlock(0, function (err, buff) {
			err.message.should.equal('FileBlockReader: Cannot read file.');
			done();
		});
	});

	it('should callback with the file system error if something went wrong reading the file', function (done) {
		var reader = new FileBlockReader(path, blockSize);

		reader.prepareToRead(function (err) {
			if (err) throw err;

			var fd = (<any> reader)._fileDescriptor;

			(<any> reader)._fileDescriptor = 10;

			reader.readBlock(0, function (err) {
				(err == null).should.be.false;

				(<any> reader)._fileDescriptor = fd;

				reader.abort(function () {
					done();
				});
			});
		});
	});
});