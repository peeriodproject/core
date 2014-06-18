/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');
import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import HydraConnectionManager = require('../../../../src/core/protocol/hydra/HydraConnectionManager');
import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import HydraNodeList = require('../../../../src/core/protocol/hydra/interfaces/HydraNodeList');
import CircuitExtender = require('../../../../src/core/protocol/hydra/CircuitExtender');
import AdditiveSharingScheme = require('../../../../src/core/crypto/AdditiveSharingScheme');

import ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');
import ReadableHydraMessageInterface = require('../../../../src/core/protocol/hydra/messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
import ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
import ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory')

import WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
import WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
import WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
import WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');
import LayeredEncDecHandler = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandler');

describe('CORE --> PROTOCOL --> HYDRA --> CircuitExtender @current', function () {

	// as this class is closely connected to the MessageCenter, we do not stub the message center

	var sandbox:SinonSandbox;

	var messagePipeEmitter:events.EventEmitter = new events.EventEmitter();

	var connectionManager:any = null;
	var messageCenter:HydraMessageCenter = null;

	var hydraMessageCallback:Function = null;

	var writableHydraMessageFactory = new WritableHydraMessageFactory();
	var readableHydraMessageFactory = new ReadableHydraMessageFactory();

	var circuitExtender:CircuitExtender = null;

	var layeredEncDec:LayeredEncDecHandler = null;

	var emitHydraMessage:Function = function (ip:string, msgType:string, message:Buffer, circuitId?:string) {
		process.nextTick(function () {
			hydraMessageCallback(ip, readableHydraMessageFactory.create(writableHydraMessageFactory.constructMessage(msgType, message, message.length, circuitId)));
		});
	};

	before(function () {
		sandbox = sinon.sandbox.create();

		connectionManager = testUtils.stubPublicApi(sandbox, HydraConnectionManager, {
			on: function (what, callback) {
				if (what === 'hydraMessage') {
					hydraMessageCallback = callback;
				}
			},
			pipeMessage: function (msgType:string, payload:Buffer, to:HydraNode, circuitId?:string) {
				messagePipeEmitter.emit('message', msgType, payload, to, circuitId);
			}
		});

		messageCenter = new HydraMessageCenter(connectionManager, new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory());

		layeredEncDec = new LayeredEncDecHandler();
	});

	after(function () {
		sandbox.restore();
	});

	it('should correctly initialize a circuit extender', function () {
		circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);
		circuitExtender.should.be.instanceof(CircuitExtender);
		circuitExtender.getNodes().length.should.equal(0);
	});

	it('should request a first circuit extension and handle its rejection', function (done) {
		var nodeToExtendWith = {
			ip: '1.1.1.1',
			port: 80
		};
		var additiveNodes = [
			{
				ip: '2.2.2.2',
				port: 70
			},
			{
				ip: '3.3.3.3',
				port: 75
			}
		];

		var circuitId:string = null;
		var uuid:string = null;

		var receivedCount = 0;

		messagePipeEmitter.on('message', function (msgType:string, payload:Buffer, to:HydraNode, circId:string) {
			receivedCount++;

			if (msgType === 'ADDITIVE_SHARING') {
				(['2.2.2.2', '3.3.3.3']).should.containEql(to.ip);
			}
			else if (msgType === 'CREATE_CELL_ADDITIVE') {
				to.ip.should.equal('1.1.1.1');
				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(payload);
				circuitId = msg.getCircuitId();
				uuid = msg.getUUID();
			}

			if (receivedCount === 3) {
				messagePipeEmitter.removeAllListeners('message');
				emitHydraMessage('1.1.1.1', 'CELL_CREATED_REJECTED', (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), circuitId);
			}
		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, (err, isRejected, newNode) => {
			(err === null).should.be.true;
			isRejected.should.be.true;
			(newNode === null).should.be.true;

			messageCenter.listeners('CELL_CREATED_REJECTED_' + circuitId).length.should.equal(0);
			done();
		});

	});

	it('should request a first circuit extension and handle the acceptance', function (done) {
		var nodeToExtendWith = {
			ip: '4.4.4.4',
			port: 80
		};
		var additiveNodes = [
			{
				ip: '2.2.2.2',
				port: 70
			},
			{
				ip: '3.3.3.3',
				port: 75
			}
		];

		var circuitId:string = null;
		var uuid:string = null;
		var dhGroup = crypto.getDiffieHellman('modp14');
		dhGroup.generateKeys();

		var receivedCount = 0;
		var bufList:Array<Buffer> = [];

		messagePipeEmitter.on('message', function (msgType:string, payload:Buffer, to:HydraNode, circId:string) {
			receivedCount++;

			if (msgType === 'ADDITIVE_SHARING') {
				(['2.2.2.2', '3.3.3.3']).should.containEql(to.ip);
				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(payload).getPayload());

				bufList.push(msg.getAdditivePayload());
			}
			else if (msgType === 'CREATE_CELL_ADDITIVE') {
				to.ip.should.equal('4.4.4.4');
				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(payload);
				circuitId = msg.getCircuitId();
				uuid = msg.getUUID();

				bufList.push(msg.getAdditivePayload());
			}

			if (receivedCount === 3) {

				var dh = AdditiveSharingScheme.getCleartext(bufList, 256);
				console.log(dh.length);
				var secret = dhGroup.computeSecret(dh);
				var sha = crypto.createHash('sha1');
				var secretHash:Buffer = sha.update(secret).digest();

				messagePipeEmitter.removeAllListeners('message');
				emitHydraMessage('4.4.4.4', 'CELL_CREATED_REJECTED', (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitId);
			}
		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, (err, isRejected, newNode) => {
			(err === null).should.be.true;
			isRejected.should.be.false;
			newNode.ip.should.equal('4.4.4.4');
			newNode.incomingKey.length.should.equal(16);
			newNode.outgoingKey.length.should.equal(16);
			newNode.circuitId.should.equal(circuitId);

			circuitExtender.getNodes()[0].ip.should.equal('4.4.4.4');
			circuitExtender.getExpectReactionFrom().ip.should.equal('4.4.4.4');
			circuitExtender.getCircuitId().should.equal(circuitId);

			done();
		});
	});

});