/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginLoaderInterface = require('../../../src/core/plugin/interfaces/PluginLoaderInterface');
import PluginNameListInterface = require('../../../src/core/plugin/interfaces/PluginNameListInterface');
import PluginPathListInterface = require('../../../src/core/plugin/interfaces/PluginPathListInterface');

import PluginLoader = require('../../../src/core/plugin/PluginLoader');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginLoader @joern', function () {
	var sandbox:SinonSandbox;
	var removeFolderAndDone:Function = function (folderPath:string, done:Function) {
		testUtils.deleteFolderRecursive(testUtils.getFixturePath(folderPath));
		done();
	};
	var createConfigStubWithPluginFolder:Function = function (folderPath:string):SinonStub {
		return testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string):any {
				if (key === 'plugin.folderPath') {
					return folderPath;
				}
				else if (key === 'plugin.pluginConfigName') {
					return 'plugin.json';
				}
				else if (key === 'plugin.activePlugins') {
					return [
						'activePlugin'
					];
				}
			}
		});
	};
	var createPluginLoaderWithPluginFolder:Function = function (fixtureFolderPath:string):PluginLoaderInterface {
		var pluginFolderPath:string = testUtils.getFixturePath(fixtureFolderPath);
		var config:any = createConfigStubWithPluginFolder(pluginFolderPath);

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

	it ('should not crash on empty function calls', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginLoader:PluginLoaderInterface;

		pluginLoader = new PluginLoader(config);
		pluginLoader.removePluginFolderNamesFromIgnoreList(null, function () {
			pluginLoader.addPluginFolderNamesToIgnoreList(null, function () {
				done();
			});
		});
	});

	it('should correctly return the items in the ignored list', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginLoader:PluginLoaderInterface;

		pluginLoader = new PluginLoader(config);
		pluginLoader.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'foobar', 'barfoo'], function () {
			pluginLoader.getIgnoredPluginFolderNames(function (names:PluginNameListInterface) {
				names.length.should.equal(4);
				names.should.be.containDeep(['foo', 'bar', 'foobar', 'barfoo']);

				done();
			});
		});
	});

	it('should correctly remove items from the ignore list', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginLoader:PluginLoaderInterface;

		pluginLoader = new PluginLoader(config);
		pluginLoader.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'barfoo'], function () {
			pluginLoader.removePluginFolderNamesFromIgnoreList(['foo', 'bar'], function () {
				pluginLoader.getIgnoredPluginFolderNames(function (names:PluginNameListInterface) {
					names.length.should.equal(2);
					names.should.be.containDeep(['foobar', 'barfoo']);

					done();
				});
			});
		});
	});

	it('should correctly create the plugin folder if it does not exist', function (done) {
		var fixturePath:string = 'plugin/plugins/getPluginFolderTest';
		var pluginLoader:PluginLoaderInterface = createPluginLoaderWithPluginFolder(fixturePath);

		pluginLoader.getPluginFolderPath(function (err:Error, folderPath:string) {
			(err === null).should.be.true;
			folderPath.should.equal(testUtils.getFixturePath(fixturePath));

			removeFolderAndDone(fixturePath, done);
		});
	});

	it('should correctly find unloaded plugins', function (done) {
		var fixturePath:string = 'plugin/plugins/unloadedPluginsFolderTest';
		var pluginLoader:PluginLoaderInterface = createPluginLoaderWithPluginFolder(fixturePath);

		pluginLoader.addPluginFolderNamesToIgnoreList(['activePlugin'], function () {
			pluginLoader.findPlugins(function (err:Error, pluginPaths:PluginPathListInterface) {
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