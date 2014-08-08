/// <reference path='../../../test.d.ts' />

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../../utils/testUtils');

import SearchFormResultsManager = require('../../../../src/core/search/SearchFormResultsManager');
import SearchRequestManager = require('../../../../src/core/search/SearchRequestManager');
import UiSearchFormResultsManagerComponent = require('../../../../src/core/ui/search/UiSearchFormResultsManagerComponent');

describe('CORE --> UI --> SEARCH --> UiSearchFormResultsManagerComponent @prio', function () {
	var sandbox:SinonSandbox;
	var component:UiSearchFormResultsManagerComponent;
	var searchFormResultsManagerStub:any;
	var searchRequestManagerStub:any;

	var responses:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		searchFormResultsManagerStub = testUtils.stubPublicApi(sandbox, SearchFormResultsManager, {
			addQuery: function () {
				return arguments[1](null, 'queryId');
			},
			transformResponses: function () {
				return arguments[2](null, arguments[0]);
			}
		});
		searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
			removeQuery: function () {
				return arguments[1](null);
			},
			getResponses: function () {
				return arguments[1](null, responses);
			}
		});

		component = new UiSearchFormResultsManagerComponent(searchFormResultsManagerStub, searchRequestManagerStub);

		responses = null;
	});

	afterEach(function () {
		sandbox.restore();
		component = null;

		searchFormResultsManagerStub = null;
		searchRequestManagerStub = null;

		responses = null;
	});

	it('should correctly instantiate without error', function () {
		component.should.be.an.instanceof(UiSearchFormResultsManagerComponent);
	});

	it('should correctly return the channel name', function () {
		component.getChannelName().should.equal('search');
	});

	it('should correctly return the event names', function () {
		component.getEventNames().should.containDeep(['addQuery', 'removeQuery']);
	});

	it('should correctly add the specified query', function (done) {
		var uiUpdateSpy = sandbox.spy();

		component.onUiUpdate(uiUpdateSpy);
		component.emit('addQuery', 'raw query');
		// should ignore the second call
		component.emit('addQuery', 'raw query');

		searchFormResultsManagerStub.addQuery.calledOnce.should.be.true;
		searchFormResultsManagerStub.addQuery.getCall(0).args[0].should.equal('raw query');

		uiUpdateSpy.calledOnce.should.be.true;

		component.getState(function (state) {
			state.should.containDeep({
				currentQuery: 'raw query',
				currentQueryStatus: 'CREATED'
			});

			(state.currentResults === null).should.be.true;

			done();
		});
	});

	it('should correctly remove a running query', function (done) {
		var uiUpdateSpy = sandbox.spy();

		component.emit('addQuery', 'raw query');
		// added after the addQuery event to get the more precise call count
		component.onUiUpdate(uiUpdateSpy);
		component.emit('removeQuery');

		searchRequestManagerStub.removeQuery.calledOnce.should.be.true;
		searchRequestManagerStub.removeQuery.getCall(0).args[0].should.equal('queryId');

		uiUpdateSpy.calledOnce.should.be.true;

		component.getState(function (state) {
			(state.currentQuery === null).should.be.true;
			(state.currentQueryStatus === null).should.be.true;

			done();
		});
	});

	it('should correctly remove the old query whenever a new query starts', function (done) {
		var uiUpdateSpy = sandbox.spy();

		component.onUiUpdate(uiUpdateSpy);
		component.emit('addQuery', 'first query');

		searchRequestManagerStub.removeQuery.called.should.be.false;

		component.emit('addQuery', 'second query');

		searchRequestManagerStub.removeQuery.calledOnce.should.be.true;
		searchRequestManagerStub.removeQuery.getCall(0).args[0].should.equal('queryId');

		uiUpdateSpy.calledTwice.should.be.true;

		component.getState(function (state) {
			state.should.containDeep({
				currentQuery: 'second query'
			});

			done();
		});
	});

	it ('should correctly return the state from the searchRequestManager on query end', function (done) {
		var uiUpdateSpy = sandbox.spy();

		component.onUiUpdate(uiUpdateSpy);
		component.emit('addQuery', 'query string');

		searchRequestManagerStub.onQueryEnd.getCall(0).args[0]('queryId', 'reason');

		uiUpdateSpy.calledTwice.should.be.true;

		component.getState(function (state) {
			state.currentQueryStatus.should.equal('reason');

			done();
		});
	});

	it ('should correctly return the state from the searchRequestManager on query canceled', function (done) {
		var uiUpdateSpy = sandbox.spy();

		component.onUiUpdate(uiUpdateSpy);
		component.emit('addQuery', 'query string');

		searchRequestManagerStub.onQueryCanceled.getCall(0).args[0]('queryId', 'reason');

		uiUpdateSpy.calledTwice.should.be.true;

		component.getState(function (state) {
			state.currentQueryStatus.should.equal('reason');

			done();
		});
	});

	describe ('should correctly get the responses for the changed queryId and transform them before updating the ui', function () {

		it ('should correctly do nothing if the changed queryId does not match the current ui query', function () {
			var uiUpdateSpy = sandbox.spy();

			component.onUiUpdate(uiUpdateSpy);

			searchRequestManagerStub.onQueryResultsChanged.getCall(0).args[0]('randomQueryId');
			searchRequestManagerStub.getResponses.called.should.be.false;

			uiUpdateSpy.called.should.be.false;
		});

		it ('should correctly get the responses from the database and do nothing if the results are malformed', function (done) {
			var uiUpdateSpy = sandbox.spy();

			component.onUiUpdate(uiUpdateSpy);

			component.emit('addQuery', 'lorem ipsum');

			setImmediate(function () {
				uiUpdateSpy.calledOnce.should.be.true;

				searchRequestManagerStub.onQueryResultsChanged.getCall(0).args[0]('queryId');

				searchRequestManagerStub.getResponses.calledOnce.should.be.true;
				searchRequestManagerStub.getResponses.getCall(0).args[0].should.equal('queryId');

				uiUpdateSpy.calledOnce.should.be.true;

				done();
			});
		});

		it ('should correctly send the responses to the transformer and trigger the ui update afterwards', function (done) {
			var uiUpdateSpy = sandbox.spy();

			responses = {
				total: 1,
				hits: [{
					item: true
				}]
			};

			component.onUiUpdate(uiUpdateSpy);

			component.emit('addQuery', 'lorem ipsum');

			setImmediate(function () {
				uiUpdateSpy.calledOnce.should.be.true;

				searchRequestManagerStub.onQueryResultsChanged.getCall(0).args[0]('queryId');

				searchFormResultsManagerStub.transformResponses.calledOnce.should.be.true;
				searchFormResultsManagerStub.transformResponses.getCall(0).args[0].should.containDeep(responses.hits);

				uiUpdateSpy.calledTwice.should.be.true;

				component.getState(function (state) {
					state.should.containDeep({
						currentQuery: 'lorem ipsum',
						currentQueryStatus: 'GOT_RESULTS',
						currentResults: {
							total: 1,
							hits: [{
								item: true
							}]
						}
					});

					done();
				});
			});
		});
	});
});