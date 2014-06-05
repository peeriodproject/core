/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PluginLoaderFactory = require('../../../src/core/plugin/PluginLoaderFactory');
var PluginLoader = require('../../../src/core/plugin/PluginLoader');

describe('CORE --> PLUGIN --> PluginLoaderFactory', function () {
    var sandbox;
    var pluginToLoadPath = 'src/plugins/textDocumentPlugin';
    var pluginsFolderPath = testUtils.getFixturePath('core/plugin/pluginLoader/plugins');
    var pluginFolderName = 'plugin';
    var configStub;

    before(function () {
        testUtils.copyFolder(pluginToLoadPath, pluginsFolderPath + '/' + pluginFolderName);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'plugin.pluginConfigName') {
                    return 'plugin.json';
                }
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        testUtils.deleteFolderRecursive(pluginsFolderPath);
    });

    it('should correctly create plugin loaders', function () {
        var pluginLoader = (new PluginLoaderFactory()).create(configStub, pluginsFolderPath + '/' + pluginFolderName);
        pluginLoader.should.be.an.instanceof(PluginLoader);
    });
});
//# sourceMappingURL=PluginLoaderFactory.js.map
