/// <reference path='../../../test.d.ts' />

// Please note that as node.js does not yet support GCM auth tags in this version, we use an 16 byte buffer filled with 0xff

require('should');

import Aes128GcmWritableMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> Aes128GcmWritableMessageFactory', function () {

	var factory:Aes128GcmWritableMessageFactory = new Aes128GcmWritableMessageFactory();

	it('should return a random buffer', function (done) {
		factory.getIV(function (buff) {
			if ((buff instanceof Buffer === true) && buff.length === 12) done();
		});
	});

	it('should correctly format the message with auth tag', function (done) {
		var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
		var plaintext = new Buffer('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255', 'hex');
		var iv = new Buffer('cafebabefacedbaddecaf888', 'hex');

		var t_hex = 'ffffffffffffffffffffffffffffffff'; // is actually d2b0daffd4e529b166d0a21ccea55a23

		factory.getIV = function (cb) { cb(iv); };

		factory.constructMessage(key, true, plaintext, function (err, buff) {
			if (!err && buff.toString('hex') === 'cafebabefacedbaddecaf8889a6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288' + t_hex ) done();
		});
	});

	it('should correctly format the message without auth tag', function (done) {
		var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
		var plaintext = new Buffer('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255', 'hex');
		var iv = new Buffer('cafebabefacedbaddecaf888', 'hex');

		factory.getIV = function (cb) { cb(iv); };

		factory.constructMessage(key, false, plaintext, function (err, buff) {
			if (!err && buff.toString('hex') === 'cafebabefacedbaddecaf8889b6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288') done();
		});
	});

	it('should throw an error when passing in wrong parameters', function (done) {
		factory = new Aes128GcmWritableMessageFactory();

		factory.constructMessage(new Buffer(10), true, new Buffer(20), function (err, buff) {
			if (err && !buff) done();
		});
	});


});