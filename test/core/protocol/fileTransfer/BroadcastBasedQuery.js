/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var BroadcastBasedQuery = require('../../../../src/core/protocol/fileTransfer/query/BroadcastBasedQuery');

var CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
var BroadcastManager = require('../../../../src/core/protocol/broadcast/BroadcastManager');
var ReadableQueryResponseMessage = require('../../../../src/core/protocol/fileTransfer/messages/ReadableQueryResponseMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> BroadcastBasedQuery @current', function () {
    var sandbox = null;

    var transferMessageCenter = null;
    var broadcastManager = null;
    var circuitManager = null;

    // CHECKERS
    var ignoredIdentifier = null;
    var sentPayload = null;
    var sendAnon = true;

    var query = null;

    var emitResult = function (response) {
        transferMessageCenter.emit('QUERY_RESPONSE_' + query.getQueryId(), testUtils.stubPublicApi(sandbox, ReadableQueryResponseMessage, {
            getFeedingNodes: function () {
                return null;
            },
            getResponseBuffer: function () {
                return new Buffer(response);
            }
        }));
    };

    it('should correctly initialize a query', function () {
        query = new BroadcastBasedQuery(new Buffer('foobar'), transferMessageCenter, circuitManager, broadcastManager, 500);
        query.should.be.instanceof(BroadcastBasedQuery);
        query.getQueryId().length.should.equal(32);
    });

    it('should emit a result when one rolls in', function (done) {
        query.once('result', function (nodes, buffer) {
            buffer.toString().should.equal('muschi');
            done();
        });

        query.kickOff();

        ignoredIdentifier.should.equal(query.getQueryId());
        sentPayload.toString().should.equal('foobar');

        emitResult('muschi');
    });

    it('should timeout end the query', function (done) {
        query.once('end', function (code) {
            transferMessageCenter.listeners('QUERY_RESPONSE_' + query.getQueryId()).length.should.equal(0);
            code.should.equal('COMPLETE');
            done();
        });
    });

    it('should let one abort the query manually', function (done) {
        query = new BroadcastBasedQuery(new Buffer('foobar'), transferMessageCenter, circuitManager, broadcastManager, 500);

        query.once('end', function (code) {
            code.should.equal('manually');
            done();
        });
        query.kickOff();

        query.abort('manually');
    });

    it('should abort the query when anonymity cannot be guaranteed', function (done) {
        query = new BroadcastBasedQuery(new Buffer('foobar'), transferMessageCenter, circuitManager, broadcastManager, 500);
        query.once('end', function (code) {
            code.should.equal('NO_ANON');
            done();
        });

        sendAnon = false;
        query.kickOff();
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        transferMessageCenter = new events.EventEmitter();
        transferMessageCenter.wrapTransferMessage = function (type, id, obj) {
            return obj;
        };

        broadcastManager = testUtils.stubPublicApi(sandbox, BroadcastManager, {
            ignoreBroadcastId: function (identifier) {
                ignoredIdentifier = identifier;
            }
        });

        circuitManager = testUtils.stubPublicApi(sandbox, CircuitManager, {
            pipeFileTransferMessageThroughAllCircuits: function (payload) {
                sentPayload = payload;
                return sendAnon;
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=BroadcastBasedQuery.js.map
