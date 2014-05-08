/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginManagerInterface = require('../../../src/core/plugin/interfaces/PluginManagerInterface');
import PluginPathListInterface = require('../../../src/core/plugin/interfaces/PluginPathListInterface');

import PluginFinder = require('../../../src/core/plugin/PluginFinder');
import PluginManager = require('../../../src/core/plugin/PluginManager');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginManager @joern', function () {
	var sandbox:SinonSandbox;
	var appDataPath:string = testUtils.getFixturePath('plugin/appDataPath');
	var createConfig:any = function ():any {
		return testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'app.dataPath') {
					return appDataPath;
				}
				else if (key === 'pluginManagerStateConfig') {
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
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);

		(new PluginManager(config, pluginFinder, {
			onOpenCallback: function () {
				done();
			}
		})).should.be.an.instanceof(PluginManager);
	});

	it('should correctly call the onOpen and onClose callback', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginManager = new PluginManager(config, pluginFinder, {
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

	it ('should correctly call the findPlugins method from the pluginFinder', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder, {
			findPlugins: function (callback:(err:Error, pluginPaths:PluginPathListInterface) => void) {
				callback(null, null);
			}
		});
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder);

		pluginManager.findNewPlugins(function (err:Error) {
			pluginFinder.findPlugins.calledOnce.should.be.true;

			done();
		});
	});

});