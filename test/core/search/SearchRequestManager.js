/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchRequestManager = require('../../../src/core/search/SearchRequestManager');

describe('CORE --> SEARCH --> SearchRequestManager @joern', function () {
    var sandbox;
    var appQuitHandlerStub;
    var searchClientStub;

    var closeAndDone = function (searchRequestManager, done) {
        searchRequestManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
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
            createOutgoingQueryIndex: function () {
                return process.nextTick(arguments[1].bind(null, null));
            },
            addIncomingResponse: function () {
                return process.nextTick(arguments[4].bind(null, null, {
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
        appQuitHandlerStub = null;
        searchClientStub = null;
    });

    it('should correctly instantiate the SearchRequestManager', function (done) {
        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub);

        manager.should.be.an.instanceof(SearchRequestManager);

        closeAndDone(manager, done);
    });

    it('should correctly open and close the manager', function (done) {
        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
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

    it('should correctly create the query index on open', function (done) {
        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                searchClientStub.createOutgoingQueryIndex.calledOnce.should.be.true;
                searchClientStub.createOutgoingQueryIndex.getCall(0).args[0].should.equal('searchqueries');

                closeAndDone(manager, done);
            }
        });
    });

    it('should correctly add a outgoing search query to the database', function (done) {
        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    (err === null).should.be.true;
                    queryId.should.be.an.instanceof(String);

                    searchClientStub.createOutgoingQuery.calledOnce.should.be.true;
                    searchClientStub.createOutgoingQuery.getCall(0).args[0].should.equal('searchqueries');
                    searchClientStub.createOutgoingQuery.getCall(0).args[1].should.equal(queryId);
                    searchClientStub.createOutgoingQuery.getCall(0).args[2].should.containDeep({ foo: true, queryId: queryId });

                    closeAndDone(manager, done);
                });
            }
        });
    });

    it('should correctly add a incoming response to the database', function (done) {
        var responseList = {
            total: 1,
            hits: [{
                    _id: 'fileHash',
                    _type: 'pluginidentifier',
                    _source: {
                        itemHash: "fileHash",
                        itemStats: {
                            stats: true
                        },
                        foo: "bar io"
                    }
                }]
        };

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    manager.addResponse(queryId, new Buffer(JSON.stringify(responseList)), { metadata: true }, function (err) {
                        console.log(err);

                        (err === null).should.be.true;

                        console.log(searchClientStub.addIncomingResponse.callCount);

                        searchClientStub.addIncomingResponse.calledOnce.should.be.true;
                        searchClientStub.addIncomingResponse.getCall(0).args[0].should.equal('searchqueries');
                        searchClientStub.addIncomingResponse.getCall(0).args[1].should.equal(queryId);
                        searchClientStub.addIncomingResponse.getCall(0).args[2].should.containDeep(responseList.hits[0]);

                        closeAndDone(manager, done);
                    });
                });
            }
        });
    });

    it('should correctly call a "onQueryAdd" listener after a new query was added', function (done) {
        var theQueryId = '';

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    theQueryId = queryId;
                });
            }
        });

        manager.onQueryAdd(function (queryId) {
            queryId.should.equal(theQueryId);

            closeAndDone(manager, done);
        });
    });

    it('should correctly call a "onQueryCanceled" listener after the `queryEnded` method was called', function (done) {
        var theQueryId = '';

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    theQueryId = queryId;

                    return setImmediate(function () {
                        manager.queryEnded(theQueryId, 'reason');
                    });
                });
            }
        });

        manager.onQueryCanceled(function (queryId, reason) {
            queryId.should.equal(theQueryId);
            reason.should.equal('reason');

            closeAndDone(manager, done);
        });
    });

    it('should correctly call a "resultsChanged" listener after a new result was added to the database and matched a running query', function (done) {
        var theQueryId = '';
        var responseList = {
            total: 1,
            hits: [{
                    _id: 'fileHash',
                    _type: 'pluginidentifier',
                    _source: {
                        itemHash: "fileHash",
                        itemStats: {
                            stats: true
                        },
                        foo: "bar io"
                    }
                }]
        };

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    theQueryId = queryId;

                    manager.addResponse(queryId, new Buffer(JSON.stringify(responseList)), { metadata: true }, function (err) {
                        (err === null).should.be.true;
                    });
                });
            }
        });

        manager.onQueryResultsChanged(function (queryId) {
            return process.nextTick(function () {
                queryId.should.equal(theQueryId);

                closeAndDone(manager, done);
            });
        });
    });

    it('should correctly call a "onQueryEnd" listener instead of "onQueryCanceled" after a new result matched the query', function (done) {
        this.timeout(5000);

        var canceledSpy = sandbox.spy();
        var theQueryId = '';
        var responseList = {
            total: 1,
            hits: [{
                    _id: 'fileHash',
                    _type: 'pluginidentifier',
                    _source: {
                        itemHash: "fileHash",
                        itemStats: {
                            stats: true
                        },
                        foo: "bar io"
                    }
                }]
        };

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
            onOpenCallback: function () {
                manager.addQuery({ foo: true }, function (err, queryId) {
                    theQueryId = queryId;

                    //responseList.hits[0]._id = theQueryId;
                    manager.addResponse(queryId, new Buffer(JSON.stringify(responseList)), { metadata: true }, function (err) {
                        (err === null).should.be.true;

                        return setImmediate(function () {
                            manager.queryEnded(theQueryId, 'reason');
                        });
                    });
                });
            }
        });

        manager.onQueryCanceled(canceledSpy);

        manager.onQueryEnd(function (queryId, reason) {
            queryId.should.equal(theQueryId);
            reason.should.equal('reason');

            canceledSpy.called.should.be.false;

            closeAndDone(manager, done);
        });
    });

    it('should correctly remove a query from the database and call "onQueryRemoved" afterwards', function (done) {
        var theQueryId = '';

        var manager = new SearchRequestManager(appQuitHandlerStub, 'searchqueries', searchClientStub, {
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
