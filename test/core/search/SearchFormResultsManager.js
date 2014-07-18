/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginManager = require('../../../src/core/plugin/PluginManager');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');
var SearchFormResultsManager = require('../../../src/core/search/SearchFormResultsManager');
var SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
var JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
var JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchFormResultsManager', function () {
    var sandbox;
    var configStub;
    var appQuitHandlerStub;
    var pluginManagerStub;
    var pluginRunnerStub;
    var searchRequestManagerStub;
    var stateHandlerFactoryStub;
    var stateHandlerStub;

    var appDataPath = testUtils.getFixturePath('/core/search/SearchFormResultsManager');

    var stateObject = null;
    var activeIdentifiers = [];
    var manager = null;

    var createSearchFormResultsManager = function (onOpen) {
        manager = new SearchFormResultsManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, pluginManagerStub, searchRequestManagerStub, {
            onOpenCallback: onOpen
        });
    };

    var closeAndDone = function (done) {
        manager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        testUtils.createFolder(appDataPath);

        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return appDataPath;
                } else if (key === 'search.searchFormStateConfig') {
                    return 'searchFormManager.json';
                }
            }
        });
        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
        pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
            getActivePluginRunner: function () {
                return process.nextTick(arguments[1].bind(null, pluginRunnerStub));
            },
            getActivePluginRunners: function () {
                return process.nextTick(arguments[0].bind(null, { 'identifier': pluginRunnerStub }));
            },
            getActivePluginRunnerIdentifiers: function () {
                return process.nextTick(arguments[0].bind(null, activeIdentifiers));
            },
            open: function () {
                return process.nextTick(arguments[0].bind(null, null));
            }
        });

        pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
            getResultFields: function () {
                return arguments[0](null, {
                    _template: 'text',
                    title: 'title',
                    content: 'content'
                });
            }
        });

        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
            addQuery: function () {
                return process.nextTick(arguments[1].bind(null, null));
            }
        });

        stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
            create: function () {
                return stateHandlerStub;
            }
        });

        stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
            load: function () {
                return process.nextTick(arguments[0].bind(null, null, stateObject));
            },
            save: function () {
                return process.nextTick(arguments[1].bind(null, null));
            }
        });
    });

    afterEach(function () {
        sandbox.restore();

        configStub = null;
        appQuitHandlerStub = null;
        pluginManagerStub = null;
        pluginRunnerStub = null;
        searchRequestManagerStub = null;
        stateHandlerFactoryStub = null;
        stateHandlerStub = null;

        stateObject = null;
        activeIdentifiers = [];

        testUtils.deleteFolderRecursive(appDataPath);
    });

    it('should correctly instantiate SearchFormResultsManager without error', function (done) {
        activeIdentifiers = ['pluginIdentifier'];

        createSearchFormResultsManager(function () {
            manager.should.be.an.instanceof(SearchFormResultsManager);

            return closeAndDone(done);
        });
    });

    it('should correctly fetch all plugin resultFields on open', function (done) {
        activeIdentifiers = ['pluginIdentifier'];

        createSearchFormResultsManager(function () {
            manager.open(function (err) {
                (err === null).should.be.true;

                pluginManagerStub.getActivePluginRunners.calledTwice.should.be.true;
                pluginRunnerStub.getResultFields.calledTwice.should.be.true;

                return closeAndDone(done);
            });
        });
    });

    it('should correctly fetch all plugin resultFields on setForm update', function (done) {
        activeIdentifiers = ['foo', 'identifier'];

        createSearchFormResultsManager(function () {
            manager.setForm('identifier', function (err) {
                (err === null).should.be.true;

                pluginManagerStub.getActivePluginRunners.calledTwice.should.be.true;
                pluginRunnerStub.getResultFields.calledTwice.should.be.true;

                return closeAndDone(done);
            });
        });
    });

    describe('should correctly return the transformed responses', function () {
        it('transformed results should be wellformed', function (done) {
            var responses = [{
                    _source: {
                        _type: 'identifier'
                    }
                }];

            activeIdentifiers = ['identifier'];

            createSearchFormResultsManager(function () {
                manager.transformResponses(responses, false, function (err, transformedResults) {
                    (err === null).should.be.true;

                    transformedResults.should.containDeep([{
                            response: {
                                _source: {
                                    _type: 'identifier'
                                }
                            },
                            fields: {
                                _template: 'text',
                                title: 'title',
                                content: 'content'
                            }
                        }]);

                    return closeAndDone(done);
                });
            });
        });

        it('should correctly clean up the result fields', function (done) {
            var responses = [{
                    _index: 'index',
                    _type: 'responseQueryId',
                    _source: {
                        _type: 'identifier',
                        _meta: {
                            meta: true
                        }
                    },
                    fields: {
                        _timestamp: 1234567890
                    }
                }];

            activeIdentifiers = ['identifier'];

            createSearchFormResultsManager(function () {
                manager.transformResponses(responses, true, function (err, transformedResults) {
                    (err === null).should.be.true;

                    transformedResults.should.containDeep([{
                            response: {
                                _source: {
                                    _type: 'identifier'
                                },
                                _timestamp: 1234567890
                            },
                            fields: {
                                _template: 'text',
                                title: 'title',
                                content: 'content'
                            }
                        }]);

                    (transformedResults[0].response._index === undefined).should.be.true;
                    (transformedResults[0].response._type === undefined).should.be.true;
                    (transformedResults[0].response._source._meta === undefined).should.be.true;
                    (transformedResults[0].response.fields === undefined).should.be.true;

                    return closeAndDone(done);
                });
            });
        });
    });
});
//# sourceMappingURL=SearchFormResultsManager.js.map
