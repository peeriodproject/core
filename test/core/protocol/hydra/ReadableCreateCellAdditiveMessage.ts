/// <reference path='../../../test.d.ts' />

import crypto = require('crypto');

require('should');

import ReadableCreateCellAdditiveMessage = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessage');

describe('CORE --> PROTOCOL --> HYDRA --> RedableCreateCellAdditiveMessage @current', function () {

	it('should correctly deformat the message (not initiator)', function () {
		var indicator = new Buffer([0x00]);

		var uuid = new Buffer('1c24b4bc201bfd3f37d8712eede483ba', 'hex');
		var payload = crypto.randomBytes(2048);

		var msg = new ReadableCreateCellAdditiveMessage(Buffer.concat([indicator, uuid, payload]));

		msg.getUUID().should.equal('1c24b4bc201bfd3f37d8712eede483ba');
		msg.isInitiator().should.be.false;
		(msg.getCircuitId() === null).should.be.true;
		msg.getAdditivePayload().toString('hex').should.equal(payload.toString('hex'));
	});

	it('should correctly deformat the message (initiator)', function () {
		var indicator = new Buffer([0x01]);
		var circuitId = new Buffer('1c24b4bcffffffff37d8712eede483ba', 'hex');
		var uuid = new Buffer('1c24b4bc201bfd3f37d8712eede483ba', 'hex');
		var payload = crypto.randomBytes(2048);

		var msg = new ReadableCreateCellAdditiveMessage(Buffer.concat([indicator, circuitId, uuid, payload]));

		msg.getCircuitId().should.equal('1c24b4bcffffffff37d8712eede483ba');
		msg.getUUID().should.equal('1c24b4bc201bfd3f37d8712eede483ba');
		msg.isInitiator().should.be.true;
		msg.getAdditivePayload().toString('hex').should.equal(payload.toString('hex'));
	});

	it('should throw an error if the indicator byte is unknown', function () {
		var indicator = new Buffer([0x04]);

		var uuid = new Buffer('1c24b4bc201bfd3f37d8712eede483ba', 'hex');
		var payload = crypto.randomBytes(2048);

		(function () {
			new ReadableCreateCellAdditiveMessage(Buffer.concat([indicator, uuid, payload]));
		}).should.throw('CreateCellAdditiveMessage: Unknow indicator byte.');
	});

	it('should throw an error if the length of the additive payload is not 2048', function () {
		var indicator = new Buffer([0x00]);

		var uuid = new Buffer('1c24b4bc201bfd3f37d8712eede483ba', 'hex');
		var payload = crypto.randomBytes(2047);

		(function () {
			new ReadableCreateCellAdditiveMessage(Buffer.concat([indicator, uuid, payload]));
		}).should.throw('CreateCellAdditiveMessage: Additive payload bad length error.');
	});

});