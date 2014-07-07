/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchResponseManager = require('../../../src/core/search/SearchResponseManager');

describe('CORE --> SEARCH --> SearchResponseManager', function () {
    var sandbox;
    var appQuitHandlerStub;
    var searchClientStub;
    var searchResults;

    var closeAndDone = function (SearchResponseManager, done) {
        SearchResponseManager.close(function () {
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
            search: function (query, callback) {
                return process.nextTick(callback.bind(null, null, searchResults));
            }
        });
        searchResults = null;
    });

    afterEach(function () {
        sandbox.restore();
        appQuitHandlerStub = null;
        searchClientStub = null;
        searchResults = null;
    });

    it('should correctly instantiate the SearchResponseManager', function (done) {
        var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub);

        manager.should.be.an.instanceof(SearchResponseManager);

        closeAndDone(manager, done);
    });

    it('should correctly open and close the manager', function (done) {
        var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
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

    describe('should correctly validate the query and return a validation error', function () {
        it('should throw an error with an empty buffer', function (done) {
            var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
                onOpenCallback: function () {
                    manager.validateQueryAndTriggerResults('queryId', new Buffer(''), function (err) {
                        err.should.be.an.instanceof(Error);
                        err.message.should.equal('SearchResponseManager~_validateQuery: Could not parse the incoming query.');

                        closeAndDone(manager, done);
                    });
                }
            });
        });

        it('should throw an error with malformed JSON as buffer', function (done) {
            var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
                onOpenCallback: function () {
                    manager.validateQueryAndTriggerResults('queryId', new Buffer('{"foo": "bar", InvalidKey: "val"}'), function (err) {
                        err.should.be.an.instanceof(Error);
                        err.message.should.equal('SearchResponseManager~_validateQuery: Could not parse the incoming query.');

                        closeAndDone(manager, done);
                    });
                }
            });
        });
    });

    it('should correctly validate the query object and request results from the database', function (done) {
        searchResults = {
            total: 1,
            hits: [{
                    _index: 'mainindex',
                    _type: 'pluginidentifier',
                    _source: {
                        itemHash: "fileHash",
                        itemPath: "../path/file.txt",
                        itemStats: {
                            stats: true
                        },
                        foo: "bar io"
                    }
                }]
        };

        var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
            onOpenCallback: function () {
                manager.validateQueryAndTriggerResults('queryId', new Buffer('{"match": {"foo": "bar"}}'), function (err) {
                    (err === null).should.be.true;

                    searchClientStub.search.calledOnce.should.be.true;
                    searchClientStub.search.getCall(0).args[0].should.containDeep({ match: { foo: 'bar' } });

                    closeAndDone(manager, done);
                });
            }
        });
    });

    it('should correctly call listeners registered for the `onResultsFound` event', function (done) {
        searchResults = {
            total: 1,
            hits: [{
                    _index: 'mainindex',
                    _type: 'pluginidentifier',
                    _source: {
                        itemHash: "fileHash",
                        itemPath: "../path/file.txt",
                        itemStats: {
                            stats: true
                        },
                        foo: "bar io"
                    }
                }]
        };

        var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
            onOpenCallback: function () {
                manager.validateQueryAndTriggerResults('queryId', new Buffer('{"match": {"foo": "bar"}}'), function (err) {
                    (err === null).should.be.true;

                    searchClientStub.search.calledOnce.should.be.true;
                    searchClientStub.search.getCall(0).args[0].should.containDeep({ match: { foo: 'bar' } });
                });
            }
        });

        manager.onResultsFound(function (queryId, results) {
            queryId.should.equal('queryId');
            results.should.be.an.instanceof(Buffer);

            results.toString().should.equal('{"total":1,"hits":[{"_type":"pluginidentifier","_source":{"itemStats":{"stats":true},"foo":"bar io"},"_id":"fileHash"}]}');

            closeAndDone(manager, done);
        });
    });

    it('should correctly call listeners registered for the `onNoResultsFound` event', function (done) {
        searchResults = {
            total: 0,
            hits: []
        };

        var manager = new SearchResponseManager(appQuitHandlerStub, searchClientStub, {
            onOpenCallback: function () {
                manager.validateQueryAndTriggerResults('queryId', new Buffer('{"match": {"foo": "bar"}}'), function (err) {
                    (err === null).should.be.true;
                });
            }
        });

        manager.onNoResultsFound(function (queryId) {
            queryId.should.equal('queryId');

            closeAndDone(manager, done);
        });
    });
});
//# sourceMappingURL=SearchResponseManager.js.map
