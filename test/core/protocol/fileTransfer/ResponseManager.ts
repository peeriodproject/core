/// <reference path='../../../test.d.ts' />

require('should');

import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
import ResponseManager = require('../../../../src/core/protocol/fileTransfer/query/ResponseManager');
import BroadcastManager = require('../../../../src/core/protocol/broadcast/BroadcastManager');
import SearchMessageBridge = require('../../../../src/core/search/SearchMessageBridge');
import FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');
import WritableQueryResponseMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableQueryResponseMessageFactory');
import TransferMessageCenter = require('../../../../src/core/protocol/fileTransfer/TransferMessageCenter');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ResponseManager', function () {

	var sandbox:SinonSandbox = null;
	var bridgeStub:any = new events.EventEmitter();
	var broadcastManagerStub:any = new events.EventEmitter();
	var circuitManagerStub:any = null;
	var writableFactoryStub:any = null;
	var transferMessageCenterStub:any = null;

	var responseManager:ResponseManager = null;

	var issuedFeed:any = {};
	var block:Buffer = null;

	var compareBuffers = function (a,b):boolean {
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

	it('should correctly instantiate the response manager', function () {
		responseManager = new ResponseManager(transferMessageCenterStub, bridgeStub, broadcastManagerStub, circuitManagerStub, writableFactoryStub);
		responseManager.should.be.instanceof(ResponseManager);
	});

	it('should correctly emit a matchBroadcastQuery event on the bridge', function (done) {
		var broadcastId = 'foobar';
		var node = {ip: '1.1.1.1', port:80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe'};
		block = FeedingNodesMessageBlock.constructBlock([node]);
		var broadcastPayload = Buffer.concat([block, new Buffer('muschi')]);

		bridgeStub.once('matchBroadcastQuery', function (id, queryBuff) {
			id.should.equal('foobar');
			queryBuff.toString().should.equal('muschi');
			for (var i=0; i<block.length; i++) {
				compareBuffers(responseManager.getPendingBroadcastQueries()['foobar'], block).should.be.true;
			}

			done();
		});

		broadcastManagerStub.emit('BROADCAST_QUERY', broadcastPayload, broadcastId);

	});

	it('should do nothing when the feeding block cannot be constructed', function (done) {

		bridgeStub.once('matchBroadcastQuery', function () {
			throw new Error('Should not emit matchBroadcastQuery');
		});

		broadcastManagerStub.emit('BROADCAST_QUERY', new Buffer('foobar'), 'foobar');

		setImmediate(function () {
			bridgeStub.removeAllListeners('matchBroadcastQuery');
			done();
		});

	});

	it('should correctly issue an EXTERNAL_FEED instruction when a query response rolls in from the bridge', function () {
		bridgeStub.emit('broadcastQueryResults', 'foobar', new Buffer('Deine mudda.'));

		Object.keys(responseManager.getPendingBroadcastQueries()).length.should.equal(0);

		issuedFeed.payload.toString().should.equal('Deine mudda.');
		compareBuffers(issuedFeed.nodesBlock, block).should.be.true;
	});

	it('should correctly add an external query handler and call it accordingly', function (done) {
		bridgeStub.once('matchBroadcastQuery', function (ident) {
			ident.should.equal('foo');

			(responseManager.getExternalQueryHandlers()['foo'] == undefined).should.be.false;

			bridgeStub.emit('broadcastQueryResults', 'foo', new Buffer('muschi'));
		});

		responseManager.externalQueryHandler('foo', new Buffer(0), function (ident, buff) {
			buff.toString().should.equal('muschi');
			ident.should.equal('foo');

			setImmediate(function () {
				Object.keys(responseManager.getExternalQueryHandlers()).length.should.equal(0);
				done();
			});
		});
	});


	before(function () {
		sandbox = sinon.sandbox.create();

		circuitManagerStub = testUtils.stubPublicApi(sandbox, CircuitManager, {
			getReadyCircuits: function () {
				return [1,2];
			},
			getRandomFeedingNodesBatch: function () {
				return null;
			}
		});

		writableFactoryStub = testUtils.stubPublicApi(sandbox, WritableQueryResponseMessageFactory, {
			constructMessage: function (batch, buff) {
				return buff;
			}
		});

		transferMessageCenterStub = testUtils.stubPublicApi(sandbox, TransferMessageCenter, {
			wrapTransferMessage: function (a, b, c) {
				return c;
			},
			issueExternalFeedToCircuit: function (nodesBlock, payload) {
				issuedFeed.nodesBlock = nodesBlock;
				issuedFeed.payload = payload;
			}
		});

	});

	after(function () {
		sandbox.restore();
	});

});