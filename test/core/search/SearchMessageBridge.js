/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var SearchMessageBridge = require('../../../src/core/search/SearchMessageBridge');
var SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
var SearchResponseManager = require('../../../src/core/search/SearchResponseManager');

describe('CORE --> SEARCH --> SearchMessageBridge', function () {
    var sandbox;
    var searchRequestManagerStub;
    var searchResponseManagerStub;

    var searchMessageBridge;

    var onQueryAddListener = null;

    var createSearchMesageBridge = function () {
        searchMessageBridge = new SearchMessageBridge(searchRequestManagerStub, searchResponseManagerStub);
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager);

        searchResponseManagerStub = testUtils.stubPublicApi(sandbox, SearchResponseManager);
    });

    afterEach(function () {
        sandbox.restore();

        searchMessageBridge = null;

        searchRequestManagerStub = null;
        searchResponseManagerStub = null;
    });

    it('should correctly instantiate the SearchMessageBridge', function () {
        createSearchMesageBridge();

        searchMessageBridge.should.be.an.instanceof(SearchMessageBridge);
    });

    it('should correctly deflate a outgoing query and trigger the `newBroadcastQuery` event', function (done) {
        createSearchMesageBridge();

        searchMessageBridge.on('newBroadcastQuery', function (queryId, compressedBody) {
            queryId.should.equal('queryId');
            compressedBody.toString('base64').should.equal('09MjAAA=');

            done();
        });

        searchRequestManagerStub.onQueryAdd.getCall(0).args[0]('queryId', new Buffer('.................................'));
    });

    it('should correctly inflate the incoming response and forward it to the SearchRequestManager', function (done) {
        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
            addResponse: function (queryId, queryBody, metadata) {
                queryId.should.equal('queryId');
                queryBody.toString().should.equal('.................................');
                metadata.should.containDeep({
                    metadata: true
                });

                done();
            }
        });

        createSearchMesageBridge();

        searchMessageBridge.emit('result', 'queryId', new Buffer('09MjAAA=', 'base64'), { metadata: true });
    });

    it('should correctly forward a `queryRemoved` event to the network layer', function (done) {
        createSearchMesageBridge();

        searchMessageBridge.on('abort', function (queryId) {
            queryId.should.equal('queryId');

            done();
        });

        searchRequestManagerStub.onQueryRemoved.getCall(0).args[0]('queryId');
    });

    it('should correctly forward an `end` event from the network layer by calling the `queryEnded` method', function (done) {
        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
            queryEnded: function (queryId, reason) {
                queryId.should.equal('queryId');
                reason.should.equal('reason');

                done();
            }
        });

        createSearchMesageBridge();

        searchMessageBridge.emit('end', 'queryId', 'reason');
    });

    it('should correctly listen to `matchBroadcastQuery` events, inflate the incoming query and forward it to the SearchResponseManager', function (done) {
        searchResponseManagerStub = testUtils.stubPublicApi(sandbox, SearchResponseManager, {
            validateQueryAndTriggerResults: function (queryId, queryBody) {
                queryId.should.equal('queryId');
                queryBody.toString().should.equal('.................................');

                done();
            }
        });

        createSearchMesageBridge();

        searchMessageBridge.emit('matchBroadcastQuery', 'queryId', new Buffer('09MjAAA=', 'base64'));
    });

    it('should correctly deflate the outgoing results and emit a `broadcastQueryResults` event', function (done) {
        createSearchMesageBridge();

        searchMessageBridge.on('broadcastQueryResults', function (queryId, compressedResults) {
            queryId.should.equal('queryId');
            compressedResults.toString('base64').should.equal('09MjAAA=');

            done();
        });

        searchResponseManagerStub.onResultsFound.getCall(0).args[0]('queryId', new Buffer('.................................'));
    });

    it('should correctly emit a `broadcastQueryResults` event without results', function (done) {
        createSearchMesageBridge();

        searchMessageBridge.on('broadcastQueryResults', function (queryId) {
            queryId.should.equal('queryId');

            done();
        });

        searchResponseManagerStub.onNoResultsFound.getCall(0).args[0]('queryId');
    });
});
//# sourceMappingURL=SearchMessageBridge.js.map
