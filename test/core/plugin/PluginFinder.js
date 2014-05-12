/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginFinder = require('../../../src/core/plugin/PluginFinder');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginFinder @joern', function () {
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
    var createPluginFinderWithPluginFolder = function (fixtureFolderPath) {
        var pluginFolderPath = testUtils.getFixturePath(fixtureFolderPath);
        var config = createConfigStubWithPluginFolder(pluginFolderPath);

        return new PluginFinder(config);
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate PluginFinder without error', function () {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);

        (new PluginFinder(config)).should.be.an.instanceof(PluginFinder);
    });

    it('should not crash on empty function calls', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginFinder;

        pluginFinder = new PluginFinder(config);
        pluginFinder.removePluginFolderNamesFromIgnoreList(null, function () {
            pluginFinder.addPluginFolderNamesToIgnoreList(null, function () {
                done();
            });
        });
    });

    it('should correctly return the items in the ignore list', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginFinder;

        pluginFinder = new PluginFinder(config);
        pluginFinder.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'foobar', 'barfoo'], function () {
            pluginFinder.getIgnoredPluginFolderNames(function (names) {
                names.length.should.equal(4);
                names.should.be.containDeep(['foo', 'bar', 'foobar', 'barfoo']);

                done();
            });
        });
    });

    it('should correctly remove items from the ignore list', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
        var pluginFinder;

        pluginFinder = new PluginFinder(config);
        pluginFinder.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'barfoo'], function () {
            pluginFinder.removePluginFolderNamesFromIgnoreList(['foo', 'bar'], function () {
                pluginFinder.getIgnoredPluginFolderNames(function (names) {
                    names.length.should.equal(2);
                    names.should.be.containDeep(['foobar', 'barfoo']);

                    done();
                });
            });
        });
    });

    it('should correctly create the plugin folder if it does not exists', function (done) {
        var fixturePath = 'plugin/plugins/getPluginFolderTest';
        var pluginFinder = createPluginFinderWithPluginFolder(fixturePath);

        pluginFinder.getPluginFolderPath(function (err, folderPath) {
            (err === null).should.be.true;
            folderPath.should.equal(testUtils.getFixturePath(fixturePath));

            removeFolderAndDone(fixturePath, done);
        });
    });

    it('should correctly return if no plugins were found', function (done) {
        var fixturePath = 'plugin/plugins/emptyPluginsFolderTest';
        var pluginFinder = createPluginFinderWithPluginFolder(fixturePath);

        pluginFinder.findPlugins(function (err, pluginPaths) {
            (err === null).should.be.true;
            (pluginPaths === null).should.be.true;

            done();
        });
    });

    it('should correctly find unloaded plugins', function (done) {
        var fixturePath = 'plugin/plugins/unloadedPluginsFolderTest';
        var pluginFinder = createPluginFinderWithPluginFolder(fixturePath);

        pluginFinder.addPluginFolderNamesToIgnoreList(['activePlugin'], function () {
            pluginFinder.findPlugins(function (err, pluginPaths) {
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
//# sourceMappingURL=PluginFinder.js.map
