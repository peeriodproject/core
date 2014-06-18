/// <reference path='../../../test.d.ts' />

import crypto = require('crypto');

require('should');

import WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> WritableCreateCellAdditiveMessageFactory', function () {

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

	var factory = new WritableCreateCellAdditiveMessageFactory();

	it('should correctly format the message (initiator)', function () {

		var uuid = '9d4bf7a0d1a7fce7163137c302582eb8';
		var circuitId = 'b10e92e6d08a2ddda968eaf053cdaf1b';

		var additivePayload = crypto.randomBytes(256);

		var m = factory.constructMessage(true, uuid, additivePayload, circuitId);

		compareBuffers(m, Buffer.concat([new Buffer([0x01]), new Buffer(circuitId, 'hex'), new Buffer(uuid, 'hex'), additivePayload])).should.be.true;
	});

	it('should correctly format the message (not initiator)', function () {
		var uuid = '9d4bf7a0d1a7fce7163137c302582eb8';
		var additivePayload = crypto.randomBytes(256);

		var m = factory.constructMessage(false, uuid, additivePayload);

		compareBuffers(m, Buffer.concat([new Buffer([0x00]), new Buffer(uuid, 'hex'), additivePayload])).should.be.true;
	});

	it('should throw an error when the payload has wrong length', function () {
		var uuid = '9d4bf7a0d1a7fce7163137c302582eb8';
		var additivePayload = crypto.randomBytes(255);

		(function () {
			factory.constructMessage(false, uuid, additivePayload);
		}).should.throw('WritableCreateCellAdditiveMessageFactory: Additive payload must be of length 256!');
	});

	it('should throw an error when it\'s initiator but has no circuit id', function () {
		var uuid = '9d4bf7a0d1a7fce7163137c302582eb8';

		var additivePayload = crypto.randomBytes(256);

		(function () {
			factory.constructMessage(true, uuid, additivePayload);
		}).should.throw('WritableCreateCellAdditiveMessageFactory: Circuit ID required when message is initiator');
	});

	it('should throw error when the length is not right 1', function () {
		var uuid = '9d4bf7a0d1a7fce7163137c302582eb';

		var additivePayload = crypto.randomBytes(256);

		(function () {
			factory.constructMessage(false, uuid, additivePayload);
		}).should.throw();
	});

	it('should throw error when the length is not right 2', function () {
		var uuid = '9d4bf7a0d1a7fce7163137c302582ebf';
		var circuitId = 'd4bf7a0d1a7fce7163137c302582ebf';

		var additivePayload = crypto.randomBytes(256);

		(function () {
			factory.constructMessage(true, uuid, additivePayload, circuitId);
		}).should.throw();
	});



});