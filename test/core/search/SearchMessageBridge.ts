/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchMessageBridge = require('../../../src/core/search/SearchMessageBridge');
import SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
import SearchResponseManager = require('../../../src/core/search/SearchResponseManager');

describe('CORE --> SEARCH --> SearchMessageBridge', function () {
	var sandbox:SinonSandbox;
	var searchRequestManagerStub:any;
	var searchResponseManagerStub:any;

	var searchMessageBridge:SearchMessageBridge;

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

	it ('should correctly instantiate the SearchMessageBridge', function () {
		createSearchMesageBridge();

		searchMessageBridge.should.be.an.instanceof(SearchMessageBridge);
	});

	it ('should correctly deflate a outgoing query and trigger the `newBroadcastQuery` event', function (done) {
		createSearchMesageBridge();

		searchMessageBridge.on('newBroadcastQuery', function (queryId, compressedBody) {
			queryId.should.equal('queryId');
			compressedBody.toString('base64').should.equal('09MjAAA=');

			done();
		});

		searchRequestManagerStub.onQueryAdd.getCall(0).args[0]('queryId', new Buffer('.................................'));
	});

	it ('should correctly inflate the incoming response and forward it to the SearchRequestManager', function (done) {
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

	it ('should correctly forward a `queryRemoved` event to the network layer', function (done) {
		createSearchMesageBridge();

		searchMessageBridge.on('abort', function (queryId) {
			queryId.should.equal('queryId');

			done();
		});

		searchRequestManagerStub.onQueryRemoved.getCall(0).args[0]('queryId');
	});

	it ('should correctly forward a `end` event from the network layer by calling the `queryEnded` method', function (done) {
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

	it ('should correctly listens to `INCOMING_QUERY_EVENT_NAME events, inflates the incoming query and forward it to the SearchResponseManager', function (done) {
		searchResponseManagerStub = testUtils.stubPublicApi(sandbox, SearchResponseManager, {
			validateQueryAndTriggerResults: function (queryId, queryBody) {
				queryId.should.equal('queryId');
				queryBody.toString().should.equal('.................................');

				done();
			}
		});

		createSearchMesageBridge();

		searchMessageBridge.emit('INCOMING_QUERY_EVENT_NAME', 'queryId', new Buffer('09MjAAA=', 'base64'));
	});

	it ('should correctly deflate the outgoing results and emit a `OUTGOING_RESULTS_EVENT_NAME` event', function (done) {
		createSearchMesageBridge();

		searchMessageBridge.on('OUTGOING_RESULTS_EVENT_NAME', function (queryId, compressedResults) {
			queryId.should.equal('queryId');
			compressedResults.toString('base64').should.equal('09MjAAA=');

			done();
		});

		searchResponseManagerStub.onResultsFound.getCall(0).args[0]('queryId', new Buffer('.................................'));
	});

});