/// <reference path='../../test.d.ts' />
var path = require('path');

require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginRunner @joern', function () {
    var sandbox;
    var pluginToLoadPath = 'src/plugins/textDocumentPlugin';
    var pluginsFolderPath = testUtils.getFixturePath('core/plugin/pluginRunner/plugins');
    var pluginFolderName = 'plugin';
    var pluginPath = pluginsFolderPath + '/' + pluginFolderName;
    var pluginFilePath = pluginPath + '/lib/index.js';
    var configStub;

    var cleanupAndDone = function (pluginRunner, done) {
        pluginRunner.cleanup();
        done();
    };

    before(function () {
        testUtils.deleteFolderRecursive(pluginsFolderPath);
        testUtils.copyFolder(pluginToLoadPath, pluginPath);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'plugin.api.basePath') {
                    return path.resolve(process.cwd(), './src/core/plugin/api');
                } else if (key === 'plugin.api.pluginApiName') {
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

    it('should correctly instantiate without errror', function (done) {
        var pluginRunner = new PluginRunner(configStub, 'identifier', pluginFilePath);
        pluginRunner.should.be.an.instanceof(PluginRunner);

        setTimeout(function () {
            cleanupAndDone(pluginRunner, done);
        }, 500);
    });

    describe('should correctly run the provided script', function () {
        var statsJson = '{"dev":16777222,"mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';
        var pluginPath = testUtils.getFixturePath('core/plugin/pluginRunner/plugin.js');

        it('should correctly call the onNewItemWillBeAdded method', function (done) {
            var pluginRunner = new PluginRunner(configStub, 'identifier', pluginPath);

            pluginRunner.onBeforeItemAdd('/path/to/item', JSON.parse(statsJson), function (err, output) {
                (err === null).should.be.true;
                output.should.containDeep({
                    foo: 'bar',
                    bar: 'foo'
                });

                cleanupAndDone(pluginRunner, done);
            });
        });
        /*it ('should correctly return a "timed out" error', function () {
        
        });*/
    });
});
//# sourceMappingURL=PluginRunner.js.map
