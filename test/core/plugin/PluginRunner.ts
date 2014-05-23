/// <reference path='../../test.d.ts' />

import path = require('path');

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginRunner @joern', function () {
	var sandbox:SinonSandbox;
	var pluginToLoadPath:string = 'src/plugins/textDocumentPlugin';
	var pluginsFolderPath:string = testUtils.getFixturePath('core/plugin/pluginRunner/plugins');
	var pluginFolderName:string = 'plugin';
	var pluginPath:string = pluginsFolderPath + '/' + pluginFolderName;
	var pluginFilePath:string = pluginPath + '/lib/index.js';
	var configStub:any;

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
				}
				else if (key === 'plugin.api.pluginApiName') {
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

	it ('should correctly instantiate without errror', function (done) {
		var pluginRunner = new PluginRunner(configStub, 'identifier', pluginFilePath);
		pluginRunner.should.be.an.instanceof(PluginRunner);

		setTimeout(function () {
			cleanupAndDone(pluginRunner, done);
		}, 500);
	});

	describe ('should correctly run the provided script', function () {
		var statsJson:string = '{"dev":16777222,"mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';
		var pluginPath:string = testUtils.getFixturePath('core/plugin/pluginRunner/plugin.js');
		var tikaGlobals = null;

		it ('should correctly return a "timed out" error', function (done) {
			this.timeout(0);

			var pluginRunner = new PluginRunner(configStub, 'identifier', testUtils.getFixturePath('core/plugin/pluginRunner/timeoutPlugin.js'));

			pluginRunner.onBeforeItemAdd('/path/to/item', JSON.parse(statsJson), tikaGlobals, function (err, output) {
				// todo check message
				err.should.be.an.instanceof(Error);
				(output === null).should.be.true;

				cleanupAndDone(pluginRunner, done);
			});
		});

		it ('should correctly return the script error', function (done) {
			var pluginRunner = new PluginRunner(configStub, 'identifier', testUtils.getFixturePath('core/plugin/pluginRunner/invalidPlugin.js'));

			pluginRunner.onBeforeItemAdd('/path/to/item', JSON.parse(statsJson), tikaGlobals, function (err, output) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('invalidFunctonCall is not defined');
				(output === null).should.be.true;

				cleanupAndDone(pluginRunner, done);
			});
		});

		it ('should correctly call the onNewItemWillBeAdded method', function (done) {
			var pluginRunner = new PluginRunner(configStub, 'identifier', pluginPath);

			pluginRunner.onBeforeItemAdd('/path/to/item', JSON.parse(statsJson), tikaGlobals, function (err, output) {
				(err === null).should.be.true;
				output.should.containDeep({
					foo: 'bar',
					bar: 'foo'
				});

				cleanupAndDone(pluginRunner, done);
			});
		});

		it ('should correctly call the getMapping method', function (done) {
			var pluginRunner = new PluginRunner(configStub, 'identifier', pluginPath);

			pluginRunner.getMapping(function (err:Error, output) {
				(err === null).should.be.true;
				output.should.containDeep({
					"tweet": {
						"properties": {
							"message": {"type": "string", "store": true }
						}
					}
				});

				cleanupAndDone(pluginRunner, done);
			});
		});
	});

});