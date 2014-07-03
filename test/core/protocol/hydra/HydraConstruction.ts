/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');
import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import ObjectConfig = require('../../../../src/core/config/ObjectConfig');

import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import ConnectionManager = require('../../../../src/core/protocol/hydra/ConnectionManager');
import CellManager = require('../../../../src/core/protocol/hydra/CellManager');
import CircuitExtenderFactory = require('../../../../src/core/protocol/hydra/CircuitExtenderFactory');
import CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
import HydraCircuitFactory = require('../../../../src/core/protocol/hydra/HydraCircuitFactory');
import HydraCircuit = require('../../../../src/core/protocol/hydra/HydraCircuit');

import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import HydraCell = require('../../../../src/core/protocol/hydra/HydraCell');
import HydraCellFactory = require('../../../../src/core/protocol/hydra/HydraCellFactory');
import NodePicker = require('../../../../src/core/protocol/hydra/NodePicker');

import WritableEncryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');
import ReadableDecryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

import ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');
import ReadableMessage = require('../../../../src/core/protocol/messages/ReadableMessage');
import ReadableHydraMessageInterface = require('../../../../src/core/protocol/hydra/messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
import ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
import ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory')

import WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
import WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
import WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
import WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');

import Aes128GcmLayeredEncDecHandlerFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandlerFactory');
import Aes128GcmReadableDecryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessageFactory');
import Aes128GcmWritableMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');

import Middleware = require('../../../../src/core/protocol/fileTransfer/Middleware');
import WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
import ReadableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/ReadableFileTransferMessageFactory');
import TransferMessageCenter = require('../../../../src/core/protocol/fileTransfer/TransferMessageCenter');
import FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');

describe('CORE --> PROTOCOL --> HYDRA --> HydraConstruction (integration) @current', function () {

	var sandbox:SinonSandbox = null;
	var config:any = null;
	var readableHydraMessageFactory = new ReadableHydraMessageFactory();
	var layeredEncDecHandlerFactory = new Aes128GcmLayeredEncDecHandlerFactory();
	var writableFileTransferMessageFactory = new WritableFileTransferMessageFactory();

	var nodes = [];

	var ipCount = 0;
	var socketCount = 0;

	var socketNodeMap = {}

	this.timeout(0);



	it('should build up 5 nodes', function () {
		for (var i=0; i<5; i++) {
			createNode();
		}

		nodes.length.should.equal(5);
	});

	it('should build up all circuits', function (done) {
		var builtUp = 0;
		var incAndCheck = function () {
			if (++builtUp === 5) done();
		}


		for (var i=0; i<5; i++) {
			nodes[i].circuitManager.once('desiredCircuitAmountReached', incAndCheck);

			nodes[i].circuitManager.kickOff();

		}

	});

	it('should pipe a FILE_TRANSFER message through and back the circuits', function (done) {
		var count = 0;

		var checkAndDone = function () {
			if (++count === 5) done();
		}

		for (var i=0; i<5; i++) {
			(function (node) {

				node.cellManager.on('cellReceivedTransferMessage', function (circuitId, payload) {
					node.cellManager.pipeFileTransferMessage(circuitId, payload);
				});

				node.transferMessageCenter.once('testMessage', function (circuitId, payload) {

					if (payload === 'foobar') {
						checkAndDone();
					}
				});

				node.circuitManager.pipeFileTransferMessageThroughAllCircuits(Buffer.concat([new Buffer(16), new Buffer([0xff]), new Buffer('foobar')]));
			})(nodes[i]);
		}
	});

	it('should pipe a FILE_TRANSFER message through and back the circuits (with random exit node)', function (done) {
		var count = 0;

		var checkAndDone = function () {
			if (++count === 5) {
				for (var i=0; i<5; i++) {
					var node = nodes[i];
					node.cellManager.removeListener('cellReceivedTransferMessage', node.cellManager.listeners('cellReceivedTransferMessage')[1]);
				}

				done();
			}
		}

		for (var i=0; i<5; i++) {
			(function (node) {

				node.cellManager.removeListener('cellReceivedTransferMessage', node.cellManager.listeners('cellReceivedTransferMessage')[1]);

				node.cellManager.on('cellReceivedTransferMessage', function (circuitId, payload) {
					node.cellManager.pipeFileTransferMessage(circuitId, payload);
				});

				node.transferMessageCenter.once('testMessage', function (circuitId, payload) {
					if (payload === 'foobar') {
						checkAndDone();
					}
				});

				node.circuitManager.pipeFileTransferMessageThroughAllCircuits(Buffer.concat([new Buffer(16), new Buffer([0xff]), new Buffer('foobar')]));
			})(nodes[i]);
		}
	});

	it('should correctly feed a node', function (done) {
		var nodeThatFeeds = nodes[0];
		var nodeThatGetsFed = nodes[nodes.length -1];

		var circNodes = nodeThatGetsFed.circuitManager.getReadyCircuits()[0].getCircuitNodes();
		var middlewareNode = circNodes[circNodes.length -1];

		var feedingNodeBlockBuffer = FeedingNodesMessageBlock.constructBlock([middlewareNode]);

		var payload = writableFileTransferMessageFactory.constructMessage(new Buffer(16).toString('hex'), 'TEST_MESSAGE', new Buffer('muschi'));

		nodeThatGetsFed.transferMessageCenter.once('testMessage', function (circuitId, payload) {
			payload.should.equal('muschi');
			done();
		});

		nodeThatFeeds.transferMessageCenter.issueExternalFeedToCircuit(feedingNodeBlockBuffer, payload);

	});


	var createNode = function () {
		ipCount++;

		var ip = ipCount + '.' + ipCount + '.' + ipCount + '.' + ipCount;

		var protocolConnectionManager:any = new events.EventEmitter();

		protocolConnectionManager.keepHydraSocketOpen = function () {};
		protocolConnectionManager.keepHydraSocketNoLongerOpen = function () {};
		protocolConnectionManager.hydraConnectTo = function (port, ips, callback) {
			var identifier = 'hydra' + ++socketCount;

			socketNodeMap[identifier] = [];
			for (var i=0, l=nodes.length; i<l; i++) {
				if (nodes[i].ip === ips || nodes[i].ip === ip) {
					socketNodeMap[identifier].push(nodes[i]);
				}
			}

			setTimeout(function (ident) {
				callback(null, ident);
			}, 50, identifier);
		};

		protocolConnectionManager.hydraWriteMessageTo = function (identifier, buffer) {
			var node = (socketNodeMap[identifier][0].ip === ip && socketNodeMap[identifier].length === 2) ? socketNodeMap[identifier][1] : socketNodeMap[identifier][0];

			if (node) {
				setTimeout(function (n, ident, buf) {

					n.protocolConnectionManager.emit('hydraMessage', ident, n.ip, testUtils.stubPublicApi(sandbox, ReadableMessage, {
						getPayload: function () {
							return buf;
						}
					}));
				}, 50, node, identifier, buffer);
			}
		};

		protocolConnectionManager.getHydraSocketIp = function (identifier:string) {
			var node = socketNodeMap[identifier];

			if (node) {
				return node.ip;
			}

			return null;
		}

		var pickBatch = function (amount) {
			var res = [];
			for (var i=0; i<nodes.length; i++) {

				if (nodes[i].ip !== ip) {
					res.push({
						ip: nodes[i].ip,
						port: nodes[i].port
					});
					if (res.length === amount) break;
				}
			}

			return res;
		};

		var connectionManager = new ConnectionManager(protocolConnectionManager, new WritableHydraMessageFactory(), new ReadableHydraMessageFactory());

		var messageCenter = new HydraMessageCenter(connectionManager, new ReadableHydraMessageFactory(), new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory(), new WritableCellCreatedRejectedMessageFactory());

		var circuitExtenderFactory = new CircuitExtenderFactory(connectionManager, messageCenter);

		var circuitFactory:any = testUtils.stubPublicApi(sandbox, HydraCircuitFactory, {
			create: function (numOfRelayNodes) {

				var nodePicker = testUtils.stubPublicApi(sandbox, NodePicker, {
					pickRelayNodeBatch : function (cb) {
						setImmediate(function () {
							cb(pickBatch(numOfRelayNodes));
						});
					},
					pickNextAdditiveNodeBatch: function (cb) {
						setImmediate(function () {
							cb(pickBatch(3));
						});
					}
				});

				return new HydraCircuit(config, 4, nodePicker, messageCenter, connectionManager, layeredEncDecHandlerFactory, circuitExtenderFactory);
			}
		});

		var cellFactory = new HydraCellFactory(config, connectionManager, messageCenter, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());

		var circuitManager = new CircuitManager(config, circuitFactory);

		var cellManager = new CellManager(config, connectionManager, messageCenter, cellFactory);

		var middleware = new Middleware(cellManager, protocolConnectionManager, messageCenter, new WritableFileTransferMessageFactory());

		var transferMessageCenter = new TransferMessageCenter(middleware, circuitManager, cellManager, messageCenter, new ReadableFileTransferMessageFactory(), new WritableFileTransferMessageFactory(), null, null);

		nodes.push({
			ip: ip,
			port: 80,
			protocolConnectionManager: protocolConnectionManager,
			circuitManager: circuitManager,
			cellManager: cellManager,
			transferMessageCenter: transferMessageCenter
		})
	};

	before(function () {
		sandbox = sinon.sandbox.create();

		config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what):any {
				if (what === 'hydra.desiredNumberOfCircuits') return 1;
				if (what === 'hydra.maximumNumberOfMaintainedCells') return 4;
				if (what === 'hydra.minimumNumberOfRelayNodes') return 4;
				if (what === 'hydra.maximumNumberOfRelayNodes') return 4;
				if (what === 'hydra.additiveSharingNodeAmount') return 3;
				if (what === 'hydra.waitForAdditiveBatchFinishInSeconds') return 10;
				if (what === 'hydra.circuit.extensionReactionTimeBaseInSeconds') return 10;
				if (what === 'hydra.circuit.extensionReactionTimeFactor') return 1.5;
				if (what === 'hydra.circuit.maximumExtensionRetries') return 2;
				if (what === 'hydra.cell.extensionReactionInSeconds') return 10;
			}
		});


	});

	after(function () {
		sandbox.restore();
	});
});