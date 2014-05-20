/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PluginLoader = require('../../../src/core/plugin/PluginLoader');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginLoader', function () {
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

    it('should instantiate the plugin loader without error', function () {
        (new PluginLoader(configStub, pluginsFolderPath + '/' + pluginFolderName)).should.be.an.instanceof(PluginLoader);
    });

    describe('should return the config fields correctly', function () {
        var pluginLoader;

        beforeEach(function () {
            pluginLoader = new PluginLoader(configStub, pluginsFolderPath + '/' + pluginFolderName);
        });

        afterEach(function () {
            pluginLoader = null;
        });

        it('should correctly return the dependencies', function () {
            pluginLoader.getDependencies().should.containDeep([]);
        });

        it('should correctly return the description', function () {
            pluginLoader.getDescription().should.equal('Analyses text documents with [Apache Tika](https://tika.apache.org)');
        });

        /*it ('should correctly return the file types', function () {
        pluginLoader.getFileTypes();
        });*/
        it('should correctly return the identifier', function () {
            pluginLoader.getIdentifier().should.equal('jj.core.documentAnalyser');
        });

        it('should correctly return the main file', function () {
            pluginLoader.getMain().should.equal('lib/main.js');
        });

        it('should correctly return the modules', function () {
            pluginLoader.getModules().should.containDeep([]);
        });

        it('should correctly return the name', function () {
            pluginLoader.getName().should.equal('Text-Document Analyser');
        });

        it('should correctly return the type', function () {
            pluginLoader.getType().should.equal('searchPlugin');
        });

        it('should correctly return the version', function () {
            pluginLoader.getVersion().should.equal('0.0.1');
        });

        it('should correctly return if the plugin is private', function () {
            pluginLoader.isPrivate().should.be.true;
        });
    });
});
//# sourceMappingURL=PluginLoader.js.map
