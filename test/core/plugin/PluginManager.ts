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
import PluginRunner = require('../../../src/core/plugin/PluginRunner');
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
	var closeAndDone = function (pluginManager, done) {
		pluginManager.close(function () {
			done();
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

		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				closeAndDone(pluginManager, done);
			}
		});

		pluginManager.should.be.an.instanceof(PluginManager);
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

						pluginManager.open(function () {
							closeAndDone(pluginManager, done);
						});
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

			closeAndDone(pluginManager, done);
		});
	});

	it ('should correctly load without a pluginState file', function (done) {
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
					closeAndDone(pluginManager, done);
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

					closeAndDone(pluginManager, done);
				});
			}
		});
	});

	it('should correctly activate the plugin trigger the "pluginAdded" event and return it\'s runner', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
			validateState: function (pluginState, callback) {
				return process.nextTick(callback.bind(null, null));
			}
		});
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
			create: function () {
				return {
					getFileMimeTypes: function () {
						return ['application/pdf'];
					}
				}
			}
		});
		var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
			create: function () {
				return pluginRunnerStub;
			}
		});
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.activatePluginState();
			}
		});

		var onPluginAdded  = function (identifier) {
			identifier.should.equal('foo bar active');

			pluginManager.removeEventListener('pluginAdded', onPluginAdded);

			pluginManager.getActivePluginRunners(function (pluginRunners) {
				pluginRunners['foo bar active'].should.equal(pluginRunnerStub);
				Object.keys(pluginRunners).length.should.equal(1);

				pluginManager.getActivePluginRunner('foo bar active', function (pluginRunner) {
					pluginRunner.should.equal(pluginRunnerStub);

					closeAndDone(pluginManager, done);
				});
			});
		};

		pluginManager.addEventListener('pluginAdded', onPluginAdded);
	});

	it('should correctly return the plugin runner specified for the mime type', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
			validateState: function (pluginState, callback) {
				return process.nextTick(callback.bind(null, null));
			}
		});
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
			create: function () {
				return {
					getFileMimeTypes: function () {
						return ['image/jpeg'];
					}
				}
			}
		});
		var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
			create: function () {
				return pluginRunnerStub;
			}
		});
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.activatePluginState(function () {
					pluginManager.getPluginRunnersForItem(testUtils.getFixturePath('core/plugin/pluginManager/image.jpg'), function (pluginRunners) {
						Object.keys(pluginRunners).length.should.equal(1);
						pluginRunners['foo bar active'].should.equal(pluginRunnerStub);

						closeAndDone(pluginManager, done);
					});
				});
			}
		});
	});

	it ('should correctly return additional fields provided by the plugins', function (done) {
		var config:any = createConfig();
		var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
		var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
			validateState: function (pluginState, callback) {
				return process.nextTick(callback.bind(null, null));
			}
		});
		var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
			create: function () {
				return {
					getFileMimeTypes: function () {
						return ['image/jpeg'];
					},
					getSettings: function () {
						return {
							useApacheTika: true
						};
					}
				}
			}
		});
		var pluginDataStub:Object = {
			model: {
				properties: {
					foo: "string"
				}
			}
		};
		var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
			onBeforeItemAdd: function (itemPath, stats, tikaGlobals, callback) {
				//console.log(tikaGlobals.fileStream);
				callback(pluginDataStub);
			}
		});
		var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
			create: function () {
				return pluginRunnerStub;
			}
		});
		var statsJson:string = '{"dev":16777222,"mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';
		var pluginManager:PluginManagerInterface = new PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
			onOpenCallback: function () {
				pluginManager.activatePluginState(function () {
					pluginManager.onBeforeItemAdd(testUtils.getFixturePath('core/plugin/pluginManager/image.jpg'), JSON.parse(statsJson), function (pluginData) {
						Object.keys(pluginData).length.should.equal(1);
						pluginData['foo bar active'].should.containDeep(pluginDataStub);

						closeAndDone(pluginManager, done);
					});
				});
			}
		});
	});

});