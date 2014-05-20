/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginLoaderFactory = require('../../../src/core/plugin/PluginLoaderFactory');
import PluginLoader = require('../../../src/core/plugin/PluginLoader');

describe('CORE --> PLUGIN --> PluginLoaderFactory @joern', function () {
	var sandbox:SinonSandbox;
	var pluginToLoadPath:string = 'src/plugins/textDocumentPlugin';
	var pluginsFolderPath:string = testUtils.getFixturePath('core/plugin/pluginLoader/plugins');
	var pluginFolderName:string = 'plugin';
	var configStub:any;

	before(function () {
		testUtils.copyFolder(pluginToLoadPath, pluginsFolderPath + '/' + pluginFolderName);

	});

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'plugin.pluginConfigName') {
					return 'plugin.json'
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

	it ('should correctly create plugin loaders', function () {
		var pluginLoader = (new PluginLoaderFactory()).create(configStub, pluginsFolderPath + '/' + pluginFolderName);
		pluginLoader.should.be.an.instanceof(PluginLoader);
	});

});