/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
var CellManager = require('../../../../src/core/protocol/hydra/CellManager');
var ResponseManager = require('../../../../src/core/protocol/fileTransfer/query/ResponseManager');

var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');
var WritableQueryResponseMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableQueryResponseMessageFactory');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ResponseManager', function () {
    var sandbox = null;
    var bridgeStub = new events.EventEmitter();
    var broadcastManagerStub = new events.EventEmitter();
    var circuitManagerStub = null;
    var writableFactoryStub = null;
    var transferMessageCenterStub = new events.EventEmitter();
    var cellManagerStub = null;
    var configStub = null;

    var responseManager = null;

    // CHECKERS
    var issuedFeed = {};
    var block = null;
    var pipedThroughCirc = {};
    var broadcastPayload = null;

    var compareBuffers = function (a, b) {
        if (a.length !== b.length)
            return false;

        var ret = true;

        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                ret = false;
                break;
            }
        }
        return ret;
    };

    it('should correctly instantiate the response manager', function () {
        responseManager = new ResponseManager(configStub, cellManagerStub, transferMessageCenterStub, bridgeStub, broadcastManagerStub, circuitManagerStub, writableFactoryStub);
        responseManager.should.be.instanceof(ResponseManager);
    });

    it('should correctly emit a matchBroadcastQuery event on the bridge', function (done) {
        var broadcastId = 'foobar';
        var node = { ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' };
        block = FeedingNodesMessageBlock.constructBlock([node]);
        var broadcastPayload = Buffer.concat([block, new Buffer('muschi')]);

        bridgeStub.once('matchBroadcastQuery', function (id, queryBuff) {
            id.should.equal('foobar');
            queryBuff.toString().should.equal('muschi');
            for (var i = 0; i < block.length; i++) {
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

    it('should correctly issue a broadcast', function () {
        transferMessageCenterStub.emit('issueBroadcastQuery', 'predecessorCirc', 'broadcastIdYo', new Buffer('muschi'), new Buffer('meine '));
        broadcastPayload.toString().should.equal('meine muschi');
    });

    it('should pipe back a result', function (done) {
        bridgeStub.emit('broadcastQueryResults', 'broadcastIdYo', new Buffer('cafebabe'));

        setTimeout(function () {
            pipedThroughCirc.circuitId.should.equal('predecessorCirc');
            pipedThroughCirc.payload.toString().should.equal('cafebabe');
            done();
        }, 30);
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'fileTransfer.response.waitForOwnResponseAsBroadcastInitiatorInSeconds')
                    return 0.01;
            }
        });

        cellManagerStub = testUtils.stubPublicApi(sandbox, CellManager, {
            pipeFileTransferMessage: function (circId, msg) {
                pipedThroughCirc.circuitId = circId;
                pipedThroughCirc.payload = msg;
            }
        });

        broadcastManagerStub.initBroadcast = function (type, payload) {
            broadcastPayload = payload;
        };

        circuitManagerStub = testUtils.stubPublicApi(sandbox, CircuitManager, {
            getReadyCircuits: function () {
                return [1, 2];
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

        transferMessageCenterStub.wrapTransferMessage = function (a, b, c) {
            return c;
        };
        transferMessageCenterStub.issueExternalFeedToCircuit = function (nodesBlock, payload) {
            issuedFeed.nodesBlock = nodesBlock;
            issuedFeed.payload = payload;
        };
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=ResponseManager.js.map
