/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchRequestManager = require('../../../src/core/search/SearchRequestManager');

describe('CORE --> SEARCH --> SearchRequestManager @joern', function () {
    var sandbox;
    var configStub;
    var appQuitHandlerStub;
    var searchClientStub;

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
                } else if (key === 'search.searchRequestManager.queryLifetimeIntervalInMilliSeconds') {
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
            },
            deleteOutgoingQuery: function () {
                return process.nextTick(arguments[2].bind(null, null));
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
        configStub = null;
        appQuitHandlerStub = null;
        searchClientStub = null;
    });

    it('should correctly instantiate the SearchRequestManager', function (done) {
        var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub);

        manager.should.be.an.instanceof(SearchRequestManager);

        closeAndDone(manager, done);
    });

    it('should correctly open and close the manager', function (done) {
        var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.open(function () {
                    searchClientStub.open.called.should.be.true;

                    manager.isOpen(function (err, isOpen) {
                        (err === null).should.be.true;
                        isOpen.should.be.true;

                        manager.close(function () {
                            searchClientStub.close.called.should.be.true;

                            manager.isOpen(function (err, isOpen) {
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

                    // queryId & expiryTimestamp check
                    searchClientStub.createOutgoingQuery.getCall(0).args[2].should.containDeep({ queryId: queryId });
                    searchClientStub.createOutgoingQuery.getCall(0).args[2].expiryTimestamp.should.be.an.instanceof(Number);
                    searchClientStub.createOutgoingQuery.getCall(0).args[2].expiryTimestamp.should.be.greaterThan(-1);

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
                    searchClientStub.addIncomingResponse.getCall(0).args[2].should.containDeep({ response: true });

                    closeAndDone(manager, done);
                });
            }
        });
    });

    it('should correctly call a "onQueryTimeout" listener after the lifetime of a query expired @prio', function (done) {
        this.timeout(5000);

        var theQueryId = '';

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

    it('should correctly call a "resultsChanged" listener after a new result was added to the database and matched a running query', function (done) {
        var theQueryId = '';
        var timeoutSpy = sandbox.spy();

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

        manager.onQueryTimeout(timeoutSpy);

        manager.onQueryResultsChanged(function (queryId) {
            return process.nextTick(function () {
                queryId.should.equal(theQueryId);

                timeoutSpy.called.should.be.false;

                closeAndDone(manager, done);
            });
        });
    });

    it('should correctly call a "queryEnd" listener instead of "onQueryTimeout" after a new result matched the query', function (done) {
        this.timeout(5000);

        var theQueryId = '';

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

        manager.onQueryEnd(function (queryId) {
            queryId.should.equal(theQueryId);

            closeAndDone(manager, done);
        });
    });

    it('should correctly remove a query from the database and call "onQueryRemoved" afterwards', function (done) {
        var theQueryId = '';

        var manager = new SearchRequestManager(configStub, appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    theQueryId = queryId;

                    manager.removeQuery(queryId);
                });
            }
        });

        manager.onQueryRemoved(function (queryId) {
            queryId.should.equal(theQueryId);

            searchClientStub.deleteOutgoingQuery.calledOnce.should.be.true;
            searchClientStub.deleteOutgoingQuery.getCall(0).args[0].should.equal('searchqueries');
            searchClientStub.deleteOutgoingQuery.getCall(0).args[1].should.equal(theQueryId);

            closeAndDone(manager, done);
        });
    });
});
//# sourceMappingURL=SearchRequestManager.js.map
