/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginFinderInterface = require('../../../src/core/plugin/interfaces/PluginFinderInterface');
import PluginNameListInterface = require('../../../src/core/plugin/interfaces/PluginNameListInterface');
import PluginPathListInterface = require('../../../src/core/plugin/interfaces/PluginPathListInterface');

import PluginFinder = require('../../../src/core/plugin/PluginFinder');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginFinder @joern', function () {
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
	var createPluginFinderWithPluginFolder:Function = function (fixtureFolderPath:string):PluginFinderInterface {
		var pluginFolderPath:string = testUtils.getFixturePath(fixtureFolderPath);
		var config:any = createConfigStubWithPluginFolder(pluginFolderPath);

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

	it ('should not crash on empty function calls', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginFinder:PluginFinderInterface;

		pluginFinder = new PluginFinder(config);
		pluginFinder.removePluginFolderNamesFromIgnoreList(null, function () {
			pluginFinder.addPluginFolderNamesToIgnoreList(null, function () {
				done();
			});
		});
	});

	it('should correctly return the items in the ignore list', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginFinder:PluginFinderInterface;

		pluginFinder = new PluginFinder(config);
		pluginFinder.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'foobar', 'barfoo'], function () {
			pluginFinder.getIgnoredPluginFolderNames(function (names:PluginNameListInterface) {
				names.length.should.equal(4);
				names.should.be.containDeep(['foo', 'bar', 'foobar', 'barfoo']);

				done();
			});
		});
	});

	it('should correctly remove items from the ignore list', function (done) {
		var config = testUtils.stubPublicApi(sandbox, ObjectConfig);
		var pluginFinder:PluginFinderInterface;

		pluginFinder = new PluginFinder(config);
		pluginFinder.addPluginFolderNamesToIgnoreList(['foo', 'bar', 'foobar', 'barfoo'], function () {
			pluginFinder.removePluginFolderNamesFromIgnoreList(['foo', 'bar'], function () {
				pluginFinder.getIgnoredPluginFolderNames(function (names:PluginNameListInterface) {
					names.length.should.equal(2);
					names.should.be.containDeep(['foobar', 'barfoo']);

					done();
				});
			});
		});
	});

	it('should correctly create the plugin folder if it does not exists', function (done) {
		var fixturePath:string = 'plugin/plugins/getPluginFolderTest';
		var pluginFinder:PluginFinderInterface = createPluginFinderWithPluginFolder(fixturePath);

		pluginFinder.getPluginFolderPath(function (err:Error, folderPath:string) {
			(err === null).should.be.true;
			folderPath.should.equal(testUtils.getFixturePath(fixturePath));

			removeFolderAndDone(fixturePath, done);
		});
	});

	it('should correctly return if no plugins were found', function (done) {
		var fixturePath:string = 'plugin/plugins/emptyPluginsFolderTest';
		var pluginFinder:PluginFinderInterface = createPluginFinderWithPluginFolder(fixturePath);

		pluginFinder.findPlugins(function (err:Error, pluginPaths:PluginPathListInterface) {
			(err === null).should.be.true;
			pluginPaths.should.be.an.instanceof(Object);
			Object.keys(pluginPaths).length.should.equal(0);

			done();
		});
	});

	it('should correctly find unloaded plugins', function (done) {
		var fixturePath:string = 'plugin/plugins/unloadedPluginsFolderTest';
		var pluginFinder:PluginFinderInterface = createPluginFinderWithPluginFolder(fixturePath);

		pluginFinder.addPluginFolderNamesToIgnoreList(['activePlugin'], function () {
			pluginFinder.findPlugins(function (err:Error, pluginPaths:PluginPathListInterface) {
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