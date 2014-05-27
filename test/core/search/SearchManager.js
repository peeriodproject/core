/// <reference path='../../test.d.ts' />
require('should');

var fs = require('fs');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginManager = require('../../../src/core/plugin/PluginManager');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchManager = require('../../../src/core/search/SearchManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchManager @joern', function () {
    var sandbox;
    var createConfig = function () {
        return testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'pluginManagerStateConfig') {
                    return 'pluginManager.json';
                }
            }
        });
    };
    var closeAndDone = function (searchManager, done) {
        searchManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate SearchManager without error', function (done) {
        var configStub = createConfig();
        var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
        var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient);

        var searchManager = new SearchManager(configStub, pluginManagerStub, searchClientStub);
        searchManager.should.be.an.instanceof(SearchManager);

        closeAndDone(searchManager, done);
    });

    it('should correctly call the addItem method', function (done) {
        var configStub = createConfig();
        var pluginsData = {
            'foo bar active': {
                file: fs.readFileSync(testUtils.getFixturePath('core/search/searchManager/tumblr_n2kwdmGLW81rkcs9uo1_400.jpg')).toString('base64')
            }
        };
        var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
            onBeforeItemAdd: function (itemPath, stats, fileHash, callback) {
                itemPath.should.equal('/path/to/item');
                stats.should.containDeep(JSON.parse(statsJson));
                fileHash.should.equal('fileHash');

                callback(pluginsData);
            }
        });
        var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {
            addItem: function (objectToIndex, callback) {
                callback(null);
            }
        });
        var statsJson = '{"dev":16777222," mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';
        var searchManager = new SearchManager(configStub, pluginManagerStub, searchClientStub);

        searchManager.addItem('/path/to/item', JSON.parse(statsJson), 'fileHash', function (err) {
            (err === null).should.be.true;

            pluginManagerStub.onBeforeItemAdd.calledOnce.should.be.true;
            searchClientStub.addItem.calledOnce.should.be.true;
            pluginManagerStub.onBeforeItemAdd.calledBefore(searchClientStub.addItem).should.be.true;

            // todo test pluginDatas passed to searchClient
            closeAndDone(searchManager, done);
        });
    });

    it('should correctly create a mapping for the given plugin identifier if it does not exists', function (done) {
        var configStub = createConfig();
        var pluginMapping = {
            properties: {
                file: {
                    type: 'attachment'
                },
                itemHash: {
                    type: 'string',
                    store: 'yes'
                },
                itemPath: {
                    type: 'string',
                    store: 'yes'
                }
            }
        };
        var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
            getMapping: function (callback) {
                callback(pluginMapping);
            }
        });
        var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
            addEventListener: function (eventName, listener) {
                return process.nextTick(listener.bind(null, 'pluginIdentifier'));
            },
            getActivePluginRunner: function (identifier, callback) {
                callback(pluginRunnerStub);
            }
        });
        var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {
            typeExists: function (identifier, callback) {
                identifier.should.equal('pluginIdentifier');
                callback(false);
            },
            addMapping: function (pluginIdentifier, mapping, callback) {
                pluginIdentifier.should.equal('pluginIdentifier');
                mapping.should.containDeep(pluginMapping);

                closeAndDone(searchManager, done);
            }
        });

        var searchManager = new SearchManager(configStub, pluginManagerStub, searchClientStub);
    });
});
//# sourceMappingURL=SearchManager.js.map
