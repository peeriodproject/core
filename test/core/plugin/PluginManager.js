/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginFinder = require('../../../src/core/plugin/PluginFinder');
var PluginManager = require('../../../src/core/plugin/PluginManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginManager @joern', function () {
    var sandbox;
    var appDataPath = testUtils.getFixturePath('plugin/appDataPath');
    var createConfig = function () {
        return testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return appDataPath;
                } else if (key === 'pluginManagerStateConfig') {
                    return 'pluginManager.json';
                }
            }
        });
    };

    beforeEach(function () {
        //testUtils.createFolder(appDataPath);
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
        //testUtils.deleteFolderRecursive(appDataPath);
    });

    it('should correctly instantiate PluginManager without error', function (done) {
        var config = createConfig();
        var pluginLoader = testUtils.stubPublicApi(sandbox, PluginFinder);

        (new PluginManager(config, pluginLoader, {
            onOpenCallback: function () {
                done();
            }
        })).should.be.an.instanceof(PluginManager);
    });

    it('should correctly call the onOpen and onClose callback', function (done) {
        var config = createConfig();
        var pluginLoader = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginManager = new PluginManager(config, pluginLoader, {
            onOpenCallback: function () {
                // waiting for the next tick!
                // The manager is still in construction and `pluginManager` will be undefined otherwise.
                setTimeout(function () {
                    // todo maybe we should pass the instance as a parameter into the callback!
                    pluginManager.close();
                }, 0);
            },
            onCloseCallback: function () {
                done();
            }
        });
    });
});
//# sourceMappingURL=PluginManager.js.map
