/// <reference path='../../test.d.ts' />

import path = require('path');

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginRunner', function () {
	var sandbox:SinonSandbox;
	var pluginToLoadPath:string = 'src/plugins/textDocumentPlugin';
	var pluginsFolderPath:string = testUtils.getFixturePath('core/plugin/pluginRunner/plugins');
	var pluginFolderName:string = 'plugin';
	var pluginPath:string = pluginsFolderPath + '/' + pluginFolderName;
	var pluginFilePath:string = pluginPath + '/lib/index.js';
	var configStub:any;

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

	it ('should correctly instantiate without errror', function () {
		(new PluginRunner(configStub, 'identifier', pluginFilePath)).should.be.an.instanceof(PluginRunner);
	});

	/*describe ('should correctly run the provided script @joern', function () {

		it ('should correctly call the onNewItemWillBeAdded method', function () {
			var pluginRunner = new PluginRunner(configStub, 'identifier', pluginFilePath);
		});
	});*/

});