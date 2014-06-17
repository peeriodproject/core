/// <reference path='../../../test.d.ts' />

import crypto = require('crypto');

require('should');

import WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> WritableCellCreatedRejectedMessageFactory', function () {

	var compareBuffers = function(a, b) {

		if (a.length !== b.length) return false;

		var ret = true;
		for (var i=0; i<a.length; i++) {
			if (a[i] !== b[i]) {
				ret = false;
				break;
			}
		}

		return ret;
	}

	var factory = new WritableCellCreatedRejectedMessageFactory();

	it('should correctly format a non-reject message', function () {

		var uuidBuf:Buffer = crypto.randomBytes(16);
		var secret:Buffer = crypto.randomBytes(20);
		var dh:Buffer = crypto.randomBytes(2048);

		compareBuffers(factory.constructMessage(uuidBuf.toString('hex'), secret, dh), Buffer.concat([uuidBuf, secret, dh])).should.be.true;
	});

	it('should correctly format a reject message', function () {
		var uuidBuf:Buffer = crypto.randomBytes(16);

		compareBuffers(factory.constructMessage(uuidBuf.toString('hex')), uuidBuf).should.be.true;
	});

	it('should throw the errors', function () {

		(function () {
			factory.constructMessage('foobar');
		}).should.throw('WritableCellCreatedRejectedMessageFactory: UUID must be of 16 octets.');

		(function () {
			factory.constructMessage('cafebabecafebabecafebabecafebabe', crypto.randomBytes(20));
		}).should.throw('WritableCellCreatedRejectedMessageFactory: Secret hash AND Diffie-Hellman must be present.');

		(function () {
			factory.constructMessage('cafebabecafebabecafebabecafebabe', crypto.randomBytes(19), crypto.randomBytes(2048));
		}).should.throw('WritableCellCreatedRejectedMessageFactory: Secret hash must be of SHA-1 hash length.');

		(function () {
			factory.constructMessage('cafebabecafebabecafebabecafebabe', crypto.randomBytes(20), crypto.randomBytes(2040));
		}).should.throw('WritableCellCreatedRejectedMessageFactory: Diffie-Hellman payload must be of length 2048!');

	});

});