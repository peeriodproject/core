/// <reference path='../../test.d.ts' />
var path = require('path');

require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginRunner', function () {
    var sandbox;
    var pluginToLoadPath = 'src/plugins/textDocumentPlugin';
    var pluginsFolderPath = testUtils.getFixturePath('core/plugin/pluginRunner/plugins');
    var pluginFolderName = 'plugin';
    var pluginPath = pluginsFolderPath + '/' + pluginFolderName;
    var pluginFilePath = pluginPath + '/lib/index.js';
    var configStub;

    before(function () {
        testUtils.deleteFolderRecursive(pluginsFolderPath);
        testUtils.copyFolder(pluginToLoadPath, pluginPath);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'plugin.api.basePath') {
                    console.log(1);
                    return path.resolve(process.cwd(), './src/core/plugin/api');
                } else if (key === 'plugin.api.pluginApiName') {
                    console.log(2);
                    return 'PluginApi.js';
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

    it('should correctly instantiate without errror', function () {
        (new PluginRunner(configStub, 'identifier', pluginFilePath)).should.be.an.instanceof(PluginRunner);
    });
    /*describe ('should correctly run the provided script @joern', function () {
    
    it ('should correctly call the onNewItemWillBeAdded method', function () {
    var pluginRunner = new PluginRunner(configStub, 'identifier', pluginFilePath);
    });
    });*/
});
//# sourceMappingURL=PluginRunner.js.map
