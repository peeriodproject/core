/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var QueryFactory = require('../../../../src/core/protocol/fileTransfer/query/QueryFactory');
var QueryManager = require('../../../../src/core/protocol/fileTransfer/query/QueryManager');
var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> QueryManager', function () {
    var sandbox = null;

    var queryManager = null;
    var bridge = null;
    var queryFactory = null;
    var config = null;
    var circuitManager = null;

    var queries = [];

    it('should correctly construct the query manager', function () {
        queryManager = new QueryManager(config, queryFactory, circuitManager, bridge);

        queryManager.should.be.instanceof(QueryManager);
        Object.keys(queryManager.getQueries()).length.should.equal(0);
    });

    it('should immediately emit an end event, when there are not enough circuits ready', function (done) {
        bridge.emit('newBroadcastQuery', 'foobar', new Buffer(10));

        bridge.once('end', function (ident, reason) {
            Object.keys(queryManager.getQueries()).length.should.equal(0);

            ident.should.equal('foobar');
            reason.should.equal('NO_ANON');
            done();
        });
    });

    it('should allow three queries', function () {
        circuitManager.emit('circuitCount', 2);

        bridge.emit('newBroadcastQuery', 'query1', new Buffer(0));
        bridge.emit('newBroadcastQuery', 'query2', new Buffer(0));
        bridge.emit('newBroadcastQuery', 'query3', new Buffer(0));

        var queries = queryManager.getQueries();

        (queries['query1'] == undefined).should.be.false;
        (queries['query2'] == undefined).should.be.false;
        (queries['query3'] == undefined).should.be.false;
    });

    it('should emit a result event', function (done) {
        bridge.once('result', function (identifier) {
            identifier.should.equal('query2');
            done();
        });

        queries[1].emit('result');
    });

    it('should remove the query when it is ended and propagate the event', function (done) {
        bridge.once('end', function (identifier) {
            identifier.should.equal('query1');

            Object.keys(queryManager.getQueries()).length.should.equal(2);

            done();
        });

        queries[0].emit('end', 'COMPLETE');
    });

    it('should not allow a new query when the maximum amount of parallel queries has been exhausted', function (done) {
        bridge.once('end', function (ident, reason) {
            ident.should.equal('query5');
            reason.should.equal('MAX_EXCEED');
            (queryManager.getQueries()['query5'] === undefined).should.be.true;
            Object.keys(queryManager.getQueries()).length.should.equal(3);
            done();
        });

        bridge.emit('newBroadcastQuery', 'query4', new Buffer(0));
        bridge.emit('newBroadcastQuery', 'query5', new Buffer(0));
    });

    it('should manually abort a query', function (done) {
        bridge.once('end', function (ident, reason) {
            ident.should.equal('query2');
            reason.should.equal('MANUAL');

            (queryManager.getQueries()['query2'] === undefined).should.be.true;
            Object.keys(queryManager.getQueries()).length.should.equal(2);

            done();
        });

        bridge.emit('abort', 'query2');
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'fileTransfer.query.maximumNumberOfParallelQueries')
                    return 3;
                if (what === 'fileTransfer.query.minimumNumberOfReadyCircuits')
                    return 2;
            }
        });

        bridge = new events.EventEmitter();

        circuitManager = new events.EventEmitter();
        circuitManager.getReadyCircuits = function () {
            return [];
        };

        queryFactory = testUtils.stubPublicApi(sandbox, QueryFactory, {
            constructBroadcastBasedQuery: function (searchObject) {
                var query = new events.EventEmitter();
                query.kickOff = function () {
                    queries.push(query);
                };

                query.abort = function (reason) {
                    query.emit('end', reason);
                };

                return query;
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=QueryManager.js.map
