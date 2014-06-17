/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import HydraConnectionManager = require('../../../../src/core/protocol/hydra/HydraConnectionManager');
import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');

import ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');
import ReadableHydraMessageInterface = require('../../../../src/core/protocol/hydra/messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
import ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
import ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory')

import WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
import WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
import WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory')
import WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory')

describe('CORE --> PROTOCOL --> HYDRA --> HydraMessageCenter @current', function () {

	var sandbox:SinonSandbox;
	var messageCenter:HydraMessageCenter = null;
	var readableHydraMessageFactory:ReadableHydraMessageFactory = new ReadableHydraMessageFactory();

	var connectionManager:any = null;


	var onHydraMessageCallback:Function = null;
	var emitHydraMessage:Function = function (fromIp:string, msg:ReadableHydraMessageInterface) {
		onHydraMessageCallback(fromIp, msg);
	};

	// CHECKERS
	var lastMessageSent:any = null;

	before(function () {
		sandbox = sinon.sandbox.create();

		connectionManager = testUtils.stubPublicApi(sandbox, HydraConnectionManager, {
			on: function (event, callback) {
				if (event === 'hydraMessage') {
					onHydraMessageCallback = callback;
				}
			},
			pipeMessage: function (msgType:string, payload:Buffer, to:HydraNode) {
				lastMessageSent = {
					type: msgType,
					payload: payload,
					to: to
				}
			}
		});
	});

	after(function () {
		sandbox.restore();
	});

	it('should correctly initialize the message center', function () {
		messageCenter = new HydraMessageCenter(connectionManager, new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory());
		messageCenter.should.be.instanceof(HydraMessageCenter);
	});

	it('should emit a CELL_CREATED_REJECTED message on the circuit Id', function (done) {
		var circuitId = 'cafebabecafebabecafebabecafebabe';
		var uuid = '32b611d793ba13d78570ea5fcce18731';
		var secretHash = crypto.randomBytes(20);
		var dhPart = crypto.randomBytes(2048);

		var hydraFact = new WritableHydraMessageFactory();
		var cellCreatedFact = new WritableCellCreatedRejectedMessageFactory();

		var cellCreatedBuf = cellCreatedFact.constructMessage(uuid, secretHash, dhPart);

		var msg = hydraFact.constructMessage('CELL_CREATED_REJECTED', cellCreatedBuf, 2084, circuitId);

		messageCenter.on('CELL_CREATED_REJECTED_cafebabecafebabecafebabecafebabe', function (ip, msg) {
			if (ip === '127.0.0.1' && msg.getUUID() === '32b611d793ba13d78570ea5fcce18731' && !msg.isRejected()) done();
		});

		emitHydraMessage('127.0.0.1', readableHydraMessageFactory.create(msg));
	});

	it('should pipe an ADDITIVE_SHARING message through', function () {
		var additiveSharingMsg = (new WritableAdditiveSharingMessageFactory()).constructMessage('127.0.0.1', 80, new Buffer('foobar'));
		var hydraFact = new WritableHydraMessageFactory();

		emitHydraMessage('1.1.1.1', readableHydraMessageFactory.create(hydraFact.constructMessage('ADDITIVE_SHARING', additiveSharingMsg)));

		lastMessageSent.type.should.equal('CREATE_CELL_ADDITIVE');
		lastMessageSent.payload.toString().should.equal('foobar');
		lastMessageSent.to.ip.should.equal('127.0.0.1');
		lastMessageSent.to.port.should.equal(80);
	});

	it('should emit a CREATE_CELL_ADDITIVE message', function (done) {
		var createCellAdditiveFact = new WritableCreateCellAdditiveMessageFactory();

		var msg = createCellAdditiveFact.constructMessage(false, 'cafebabecafebabecafebabecafebabe', crypto.randomBytes(2048));

		messageCenter.on('CREATE_CELL_ADDITIVE', function (ip, msg) {
			if (ip === '127.0.0.1' && msg.getUUID() === 'cafebabecafebabecafebabecafebabe') done();
		});

		emitHydraMessage('127.0.0.1', readableHydraMessageFactory.create((new WritableHydraMessageFactory()).constructMessage('CREATE_CELL_ADDITIVE', msg)));
	});

	it('should pipe an ADDITIVE_SHARING message to the connection manager', function () {
		var additivePayload = crypto.randomBytes(2048);

		messageCenter.sendAdditiveSharingMessage({ip:'127.0.0.2', port:88}, '44.44.44.44', 80, 'cafebabecafebabecafebabecafebabe', additivePayload);


		lastMessageSent.type.should.equal('ADDITIVE_SHARING');
		lastMessageSent.to.ip.should.equal('127.0.0.2');
		lastMessageSent.to.port.should.equal(88);

		var readableAdditive = (new ReadableAdditiveSharingMessageFactory()).create(lastMessageSent.payload);

		readableAdditive.getIp().should.equal('44.44.44.44');
		readableAdditive.getPort().should.equal(80);

		var readableCreate = (new ReadableCreateCellAdditiveMessageFactory()).create(readableAdditive.getPayload());

		readableCreate.getUUID().should.equal('cafebabecafebabecafebabecafebabe');
		readableCreate.isInitiator().should.be.false;
		readableCreate.getAdditivePayload().toString('hex').should.equal(additivePayload.toString('hex'));
	});

});