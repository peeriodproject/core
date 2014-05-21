/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginManagerInterface = require('../../../src/core/plugin/interfaces/PluginManagerInterface');
import PluginPathListInterface = require('../../../src/core/plugin/interfaces/PluginPathListInterface');

import PluginFinder = require('../../../src/core/plugin/PluginFinder');
import PluginManager = require('../../../src/core/plugin/PluginManager');
//import PluginRunner = require('../../../src/core/plugin/PluginRunner');
import PluginLoaderFactory = require('../../../src/core/plugin/PluginLoaderFactory');
import PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
import PluginValidator = require('../../../src/core/plugin/PluginValidator');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginManager @joern', function () {
	var sandbox:SinonSandbox;
	var appDataPath:string = testUtils.getFixturePath('core/plugin/appDataPath');
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
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);

		(new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				done();
			}
		})).should.be.an.instanceof(PluginManager);
	});

	it('should correctly call the onOpen and onClose callback', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
		var pluginManager = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback : function () {
				pluginManager.open(function () {
					pluginManager.close();
				});
			},
			onCloseCallback: function (err) {
				pluginManager.close(function (err) {
					pluginManager.isOpen(function (err, isOpen) {
						isOpen.should.be.false;

						done();
					});
				});
			}
		});
	});

	it('should correctly call the findPlugins method from the pluginFinder', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder, {
			findPlugins: function (callback:(err:Error, pluginPaths:PluginPathListInterface) => void) {
				callback(null, null);
			}
		});
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory);

		pluginManager.findNewPlugins(function (err:Error) {
			pluginFinder.findPlugins.calledOnce.should.be.true;

			done();
		});
	});

	it ('should correctly load witout a pluginState file', function (done) {
		var config:any = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'app.dataPath') {
					return appDataPath;
				}
				else if (key === 'pluginManagerStateConfig') {
					return 'invalidFileName.json';
				}
			}
		});
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.getActivePluginRunners(function (pluginState) {
					done();
				});
			}
		});

	});

	it('should correctly load the pluginState from disk', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.getPluginState(function (pluginState) {
					var state = {
						idle    : [
							{
								name : 'foo bar idle',
								path : '/path',
								hash : '123',
								since: 123456
							}
						],
						inactive: [
							{
								name : 'foo bar inactive',
								path : '/path',
								hash : '123',
								since: 123456
							}
						],
						active  : [
							{
								name : 'foo bar active',
								path : '/path',
								hash : '123',
								since: 123456
							}
						]
					};

					pluginState.should.containDeep(state);

					done();
				});
			}
		});
	});

	it('should correctly activate the plugin and return it\'s runner', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
			validateState: function (pluginState, callback) {
				return process.nextTick(callback.bind(null, null));
			}
		});
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
			create: function () {
				return 'pluginRunnerObject'
			}
		});
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.activatePluginState(function () {
					pluginManager.getActivePluginRunners(function (pluginRunners) {
						pluginRunners['foo bar active'].should.equal('pluginRunnerObject');
						Object.keys(pluginRunners).length.should.equal(1);

						pluginManager.getActivePluginRunner('foo bar active', function (pluginRunner) {
							pluginRunner.should.equal('pluginRunnerObject');

							done();
						});
					});
				});
			}
		});
	});

	/*it('should correctly run a plugin', function () {

	});*/

});