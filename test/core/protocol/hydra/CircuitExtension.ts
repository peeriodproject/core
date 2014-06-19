/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');
import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import ConnectionManager = require('../../../../src/core/protocol/hydra/ConnectionManager');
import ProtocolConnectionManager = require('../../../../src/core/protocol/net/ProtocolConnectionManager');
import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import HydraNodeList = require('../../../../src/core/protocol/hydra/interfaces/HydraNodeList');
import CircuitExtender = require('../../../../src/core/protocol/hydra/CircuitExtender');
import AdditiveSharingScheme = require('../../../../src/core/crypto/AdditiveSharingScheme');

import ReadableMessage = require('../../../../src/core/protocol/messages/ReadableMessage');
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

describe('CORE --> PROTOCOL --> HYDRA --> Circuit extension (integration) @current', function () {

	this.timeout(0);

	var sandbox:SinonSandbox = null;

	// STUBS
	var protocolConnectionManagerStub:any = null;

	// HELPERS

	var theSocketIdentifier:string = null;
	var openSockets:Array<string> = [];

	var messageListener:events.EventEmitter = new events.EventEmitter();

	var terminationCallback:Function = null;
	var emitTermination:Function = function (identifier:string) {
		var i = openSockets.indexOf(identifier);
		if (i > -1 ) {
			openSockets.splice(i, 1);
			terminationCallback(identifier);
		}
	};

	var messageCallback:Function = null;
	var writableHydraMessageFactory:WritableHydraMessageFactory = new WritableHydraMessageFactory();
	var readablyHydraMessageFactory:ReadableHydraMessageFactory = new ReadableHydraMessageFactory();

	var emitHydraMessage:Function = function (type:string, identifier:string, messagePayload:Buffer, circuitId?:string) {
		var msgPayload = writableHydraMessageFactory.constructMessage(type, messagePayload, messagePayload.length, circuitId);
		var msg:any = testUtils.stubPublicApi(sandbox, ReadableMessage, {
			getPayload: function () {
				return msgPayload;
			}
		});
		messageCallback(identifier, null, msg);
	}

	var connectionError:Error = null;
	var socketCount:number = 0;

	// INSTANCES USED
	var connectionManager:ConnectionManager = null;
	var messageCenter:HydraMessageCenter = null;
	var layeredEncDec:LayeredEncDecHandler = null;
	var circuitExtender:CircuitExtender = null;

	it('should correctly instantiate the connection manager, message center, and extender', function () {
		connectionManager = new ConnectionManager(protocolConnectionManagerStub, new WritableHydraMessageFactory(), new ReadableHydraMessageFactory());
		messageCenter = new HydraMessageCenter(connectionManager, new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory());
		layeredEncDec = new LayeredEncDecHandler();

		circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);

		connectionManager.should.be.instanceof(ConnectionManager);
		messageCenter.should.be.instanceof(HydraMessageCenter);
		layeredEncDec.should.be.instanceof(LayeredEncDecHandler);
		circuitExtender.should.be.instanceof(CircuitExtender);


	});

	it('should pipe all the message and add the node to extend with to the circuit nodes and handle the timeout', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '1.1.1.1',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '2.2.2.2',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];

		var count = 0;
		messageListener.on('message', function (identifier, msg:ReadableHydraMessageInterface) {

			if (msg.getMessageType() === 'CREATE_CELL_ADDITIVE') {
				count++;
				connectionManager.getCircuitNodes()[identifier].socketIdentifier.should.equal(identifier);
				connectionManager.getCircuitNodes()[identifier].circuitId.should.equal(circuitExtender.getCircuitId());
				(connectionManager.getCircuitNodes()[identifier] === circuitExtender.getExpectReactionFrom()).should.be.true;
			}
			else if (msg.getMessageType() === 'ADDITIVE_SHARING') count++;
		});


		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err:Error, isRejected, newNode) {
			messageListener.removeAllListeners('message');

			count.should.equal(3);
			err.message.should.equal('CircuitExtender: Timed out');
			isRejected.should.be.false;
			(newNode == null).should.be.true;

			Object.keys(connectionManager.getCircuitNodes()).length.should.equal(0);

			done();
		});

	});

	it('should correctly handle the termination of a circuit socket while extending', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '1.1.1.1',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '2.2.2.2',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];


		messageListener.on('message', function (identifier, msg:ReadableHydraMessageInterface) {

			if (msg.getMessageType() === 'CREATE_CELL_ADDITIVE') {

				emitTermination(identifier);
			}

		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
			messageListener.removeAllListeners('message');

			err.message.should.equal('CircuitExtender: Circuit socket terminated');
			Object.keys(connectionManager.getCircuitNodes()).length.should.equal(0);
			circuitExtender.getNodes().length.should.equal(0);
			layeredEncDec.getNodes().length.should.equal(0);

			done();
		});
	});

	it('should correctly handle the acceptance of a circuit extension (first node)', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '1.1.1.1',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '2.2.2.2',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];

		var receivedCount = 0;
		var bufList:Array<Buffer> = [];
		var circuitId:string = null;
		var uuid:string = null;
		var dhGroup = crypto.getDiffieHellman('modp14');
		dhGroup.generateKeys();

		messageListener.on('message', function (identifier, message:ReadableHydraMessageInterface) {

			receivedCount++;

			if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
				theSocketIdentifier = identifier;

				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(message.getPayload());
				circuitId = msg.getCircuitId();
				uuid = msg.getUUID();

				bufList.push(msg.getAdditivePayload());
			}
			else if (message.getMessageType() == 'ADDITIVE_SHARING') {
				(connectionManager.getCircuitNodes()[identifier] == undefined).should.be.true;
				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(message.getPayload()).getPayload());

				bufList.push(msg.getAdditivePayload());
			}

			if (receivedCount === 3) {

				var dh = AdditiveSharingScheme.getCleartext(bufList, 256);
				var secret = dhGroup.computeSecret(dh);
				var sha = crypto.createHash('sha1');
				var secretHash:Buffer = sha.update(secret).digest();

				messageListener.removeAllListeners('message');

				emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitId);
			}
		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
			(newNode === connectionManager.getCircuitNodes()[theSocketIdentifier]).should.be.true;
			(newNode === layeredEncDec.getNodes()[0]).should.be.true;
			(newNode === circuitExtender.getExpectReactionFrom()).should.be.true;

			newNode.incomingKey.length.should.equal(16);
			newNode.outgoingKey.length.should.equal(16);
			newNode.socketIdentifier.should.equal(theSocketIdentifier);

			newNode.incomingKey = newNode.outgoingKey;

			done();
		});
	});

	it('should handle the rejection of an extension (second node)', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '2.2.2.2',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '3.3.3.3',
				port: 80
			},
			{
				ip: '4.4.4.4',
				port: 80
			}
		];

		var uuid:string = null;

		messageListener.on('message', function (identifier, message:ReadableHydraMessageInterface) {

			if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
				identifier.should.equal(theSocketIdentifier);

				layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {

					var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
					uuid = msg.getUUID();

					messageListener.removeAllListeners('message');

					emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), layeredEncDec.getNodes()[0].circuitId);
				});

			}

		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {

			// wait until all messages have been sent. it's a bit too fast
			setTimeout(function () {
				isRejected.should.be.true;
				(err == null).should.be.true;
				(newNode == null).should.be.true;

				Object.keys(connectionManager.getCircuitNodes()).length.should.equal(1);

				(circuitExtender.getExpectReactionFrom() === layeredEncDec.getNodes()[0]).should.be.true;

				done();
			}, 500);
		});

	});

	it('should handle the acceptance of an extension (second ndoe)', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '4.4.4.4',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '2.2.2.2',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];

		var receivedCount = 0;
		var bufList:Array<Buffer> = [];
		var uuid:string = null;
		var dhGroup = crypto.getDiffieHellman('modp14');
		dhGroup.generateKeys();

		var check = function () {
			if (receivedCount === 3) {

				var dh = AdditiveSharingScheme.getCleartext(bufList, 256);

				var secret = dhGroup.computeSecret(dh);
				var sha = crypto.createHash('sha1');
				var secretHash:Buffer = sha.update(secret).digest();

				messageListener.removeAllListeners('message');

				emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitExtender.getCircuitId());
			}
		}

		messageListener.on('message', function (identifier, message:ReadableHydraMessageInterface) {

			receivedCount++;


			if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
				theSocketIdentifier.should.equal(identifier);

				layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {

					var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
					uuid = msg.getUUID();

					bufList.push(msg.getAdditivePayload());

					check();
				});

			}
			else if (message.getMessageType() == 'ADDITIVE_SHARING') {
				(connectionManager.getCircuitNodes()[identifier] == undefined).should.be.true;
				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(message.getPayload()).getPayload());

				bufList.push(msg.getAdditivePayload());

				check();
			}


		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
			(newNode === layeredEncDec.getNodes()[1]).should.be.true;

			circuitExtender.getNodes().length.should.equal(2);
			Object.keys(connectionManager.getCircuitNodes()).length.should.equal(1);

			newNode.incomingKey.length.should.equal(16);
			newNode.outgoingKey.length.should.equal(16);

			newNode.incomingKey = newNode.outgoingKey;

			done();
		});
	});

	it('should not react to messages when the circuit socket terminates', function (done) {
		var nodeToExtendWith:HydraNode = {
			ip: '2.2.2.2',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '5.5.5.5',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];


		messageListener.on('message', function (identifier, message:ReadableHydraMessageInterface) {

			if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
				messageListener.removeAllListeners('message');

				emitTermination(theSocketIdentifier);

				theSocketIdentifier.should.equal(identifier);

				layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {

					var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
					var uuid = msg.getUUID();

					emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), circuitExtender.getCircuitId());
				});

			}


		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
			err.message.should.equal('CircuitExtender: Timed out');

			connectionManager.listeners('CELL_CREATED_REJECTED_' + circuitExtender.getCircuitId()).length.should.equal(0);
			connectionManager.listeners('circuitTermination').length.should.equal(0);

			setTimeout(function () {
				done();
			}, 300);
		});
	});

	it('should error out if the hash of the secret does not match', function (done) {
		layeredEncDec = new LayeredEncDecHandler();

		circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);

		var nodeToExtendWith:HydraNode = {
			ip: '2.2.2.2',
			port: 80
		};

		var additiveNodes:HydraNodeList = [
			{
				ip: '5.5.5.5',
				port: 80
			},
			{
				ip: '3.3.3.3',
				port: 80
			}
		];

		messageListener.on('message', function (identifier, message:ReadableHydraMessageInterface) {

			if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
				messageListener.removeAllListeners('message');

				var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(message.getPayload());
				var uuid = msg.getUUID();
				var circuitId = msg.getCircuitId()

				emitHydraMessage('CELL_CREATED_REJECTED', identifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, crypto.randomBytes(20), crypto.randomBytes(256)), circuitId);
			}
		});

		circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err) {
			err.message.should.equal('CircuitExtender: Hashes of shared secret do not match.');
			done();
		});
	});


	before(function () {
		sandbox = sinon.sandbox.create();

		protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
			on: function (what, callback) {
				if (what === 'terminatedConnection') {
					terminationCallback = callback;
				}
				else if (what === 'hydraMessage') {
					messageCallback = callback;
				}
			},
			hydraConnectTo: function (port:number, ip:string, callback) {
				if (connectionError) {
					setTimeout(function () {
						callback(connectionError);
					}, 10);
				}
				else {
					setTimeout(function () {
						var identifier = 'hydra' + ++socketCount;
						openSockets.push(identifier);
						callback(null, identifier);
					}, 10);
				}
			},
			hydraWriteMessageTo: function (identifier:string, sendableBuffer:Buffer) {
				if (openSockets.indexOf(identifier) > -1) {
					var msg = readablyHydraMessageFactory.create(sendableBuffer);
					setImmediate(function () {
						messageListener.emit('message', identifier, msg);
					});
				}
			}

		});
	});

	after(function () {
		sandbox.restore();
	});

});