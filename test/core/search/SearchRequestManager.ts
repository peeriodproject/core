/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchRequestManager = require('../../../src/core/search/SearchRequestManager');

describe('CORE --> SEARCH --> SearchRequestManager @joern', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var appQuitHandlerStub:any;
	var searchClientStub:any;

	var closeAndDone = function (searchRequestManager, done) {
		searchRequestManager.close(function () {
			done();
		});
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'search.queryLifetimeInSeconds') {
					return 2;
				}
				else if (key === 'search.searchRequestManager.queryLifetimeIntervalInMilliSeconds') {
					return 500;
				}
			}
		});
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
		searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {

			close: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			},

			open: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			},

			addPercolate: function (percolateParams, callback) {
				return process.nextTick(callback.bind(null, null));
			},

			createOutgoingQuery: function () {
				return process.nextTick(arguments[3].bind(null, null));
			},

			addIncomingResponse: function () {
				return process.nextTick(arguments[3].bind(null, null, {
					total: 1,
					matches: [
						{ _index: arguments[0], _id: arguments[1] }
					]
				}));
			}

		});
	});

	afterEach(function () {
		sandbox.restore();
		configStub = null;
		appQuitHandlerStub = null;
		searchClientStub = null;
	});

	it ('should correctly instantiate the SearchRequestManager', function (done) {
		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub);

		manager.should.be.an.instanceof(SearchRequestManager);

		closeAndDone(manager, done);
	});

	it ('should correctly open and close the manager', function (done) {
		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
			onOpenCallback: function () {
				manager.open(function () {
					searchClientStub.open.called.should.be.true;

					manager.isOpen(function (err:Error, isOpen:boolean) {
						(err === null).should.be.true;
						isOpen.should.be.true;

						manager.close(function () {
							searchClientStub.close.called.should.be.true;

							manager.isOpen(function (err:Error, isOpen:boolean) {
								(err === null).should.be.true;
								isOpen.should.be.false;

								closeAndDone(manager, done);
							});
						});
					});
				});
			}
		});
	});

	it('should correctly add a outgoing search query to the database', function (done) {
		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
			onOpenCallback: function () {
				manager.addQuery({ foo: true }, function (err, queryId) {
					(err === null).should.be.true;
					queryId.should.be.an.instanceof(String);

					searchClientStub.createOutgoingQuery.calledOnce.should.be.true;
					searchClientStub.createOutgoingQuery.getCall(0).args[0].should.equal('searchqueries');
					searchClientStub.createOutgoingQuery.getCall(0).args[1].should.equal(queryId);
					searchClientStub.createOutgoingQuery.getCall(0).args[2].should.containDeep({ foo: true });

					closeAndDone(manager, done);
				});
			}
		});
	});

	it('should correctly add a incoming response to the database', function (done) {
		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
			onOpenCallback: function () {

				manager.addResponse('searchQueryId', { response: true }, function (err) {
					(err === null).should.be.true;

					searchClientStub.addIncomingResponse.calledOnce.should.be.true;
					searchClientStub.addIncomingResponse.getCall(0).args[0].should.equal('searchqueries');
					searchClientStub.addIncomingResponse.getCall(0).args[1].should.equal('searchQueryId');
					searchClientStub.addIncomingResponse.getCall(0).args[2].should.containDeep({ response: true	});

					closeAndDone(manager, done);
				});
			}
		});
	});

	it('should correctly call a "onQueryTimeout" listener after the lifetime of a query expired', function (done) {
		this.timeout(5000);

		var theQueryId:string = '';

		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
			onOpenCallback: function () {
				manager.addQuery({ foo: true }, function (err, queryId) {
					theQueryId = queryId;
				});
			}
		});

		manager.onQueryTimeout(function (queryId) {
			queryId.should.equal(theQueryId);

			closeAndDone(manager, done);
		});
	});

	it ('should correctly call  a "resultsChanged" listener after a new result was added to the database and matched a running query', function (done) {
		var theQueryId:string = '';

		var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
			onOpenCallback: function () {
				manager.addQuery({ foo: true }, function (err, queryId) {
					theQueryId = queryId;

					manager.addResponse(queryId, { response: true }, function (err) {
						(err === null).should.be.true;
					});
				});
			}
		});

		manager.onQueryResultsChanged(function (queryId) {
			queryId.should.equal(theQueryId);

			closeAndDone(manager, done);
		});
	});

});