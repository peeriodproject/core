/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginLoader = require('../../../src/core/plugin/PluginLoader');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginLoader @joern', function () {
    var sandbox;
    var removeFolderAndDone = function (folderPath, done) {
        testUtils.deleteFolderRecursive(testUtils.getFixturePath(folderPath));
        done();
    };
    var createConfigStubWithPluginFolder = function (folderPath) {
        return testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'plugin.folderPath') {
                    return folderPath;
                } else if (key === 'plugin.pluginConfigName') {
                    return 'plugin.json';
                } else if (key === 'plugin.activePlugins') {
                    return [
                        'activePlugin'
                    ];
                }
            }
        });
    };
    var createPluginLoaderWithPluginFolder = function (fixtureFolderPath) {
        var pluginFolderPath = testUtils.getFixturePath(fixtureFolderPath);
        var config = createConfigStubWithPluginFolder(pluginFolderPath);

        return new PluginLoader(config);
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate PluginLoader without error', function () {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);

        (new PluginLoader(config)).should.be.an.instanceof(PluginLoader);
    });

    it('should not crash on empty function calls', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginLoader;

        pluginLoader = new PluginLoader(config);
        pluginLoader.removePluginFolderNamesFromIgnoreList(null, function () {
            pluginLoader.addPluginFolderNamesToIgnoreList(null, function () {
                done();
            });
        });
    });

    it('should correctly return the items in the ignored list', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginLoader;

        pluginLoader = new PluginLoader(config);
        pluginLoader.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'foobar', 'barfoo'], function () {
            pluginLoader.getIgnoredPluginFolderNames(function (names) {
                names.length.should.equal(4);
                names.should.be.containDeep(['foo', 'bar', 'foobar', 'barfoo']);

                done();
            });
        });
    });

    it('should correctly remove items from the ignore list', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginLoader;

        pluginLoader = new PluginLoader(config);
        pluginLoader.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'barfoo'], function () {
            pluginLoader.removePluginFolderNamesFromIgnoreList(['foo', 'bar'], function () {
                pluginLoader.getIgnoredPluginFolderNames(function (names) {
                    names.length.should.equal(2);
                    names.should.be.containDeep(['foobar', 'barfoo']);

                    done();
                });
            });
        });
    });

    it('should correctly create the plugin folder if it does not exist', function (done) {
        var fixturePath = 'plugins/getPluginFolderTest';
        var pluginLoader = createPluginLoaderWithPluginFolder(fixturePath);

        pluginLoader.getPluginFolderPath(function (err, folderPath) {
            (err === null).should.be.true;
            folderPath.should.equal(testUtils.getFixturePath(fixturePath));

            removeFolderAndDone(fixturePath, done);
        });
    });

    it('should correctly find unloaded plugins', function (done) {
        var fixturePath = 'plugins/unloadedPluginsFolderTest';
        var pluginLoader = createPluginLoaderWithPluginFolder(fixturePath);

        pluginLoader.addPluginFolderNamesToIgnoreList(['activePlugin'], function () {
            pluginLoader.findPlugins(function (err, pluginPaths) {
                (err === null).should.be.true;
                Object.keys(pluginPaths).length.should.equal(1);

                pluginPaths['unloadedPlugin'].indexOf(fixturePath + '/unloadedPlugin').should.greaterThan(-1);

                var pathParts = pluginPaths['unloadedPlugin'].split('/');
                pathParts[pathParts.length - 1].should.equal('unloadedPlugin');

                done();
            });
        });
    });
});
//# sourceMappingURL=PluginLoader.js.map
