/// <reference path='../../test.d.ts' />

import path = require('path');

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginLoader = require('../../../src/core/plugin/PluginLoader');

// todo add json error tests
describe('CORE --> PLUGIN --> PluginLoader', function () {
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

	it('should instantiate the plugin loader without error', function () {
		(new PluginLoader(configStub, pluginsFolderPath + '/' + pluginFolderName)).should.be.an.instanceof(PluginLoader);
	});

	describe('should return the config fields correctly', function () {
		var pluginLoader;

		beforeEach(function () {
			pluginLoader = new PluginLoader(configStub, pluginsFolderPath + '/' + pluginFolderName);
		});

		afterEach(function () {
			pluginLoader = null;
		});

		it('should correctly return the dependencies', function () {
			pluginLoader.getDependencies().should.containDeep([]);
		});

		it('should correctly return the description', function () {
			pluginLoader.getDescription().should.equal('Analyses text documents with [Apache Tika](https://tika.apache.org)');
		});

		it('should correctly return the file extensions', function () {
			pluginLoader.getFileExtensions().length.should.be.greaterThan(0);
		});

		it('should correctly return the file mime types', function () {
			pluginLoader.getFileMimeTypes().length.should.be.greaterThan(0);
		});

		/*it ('should correctly return the file types', function () {
		 pluginLoader.getFileTypes();
		 });*/

		it('should correctly return the identifier', function () {
			pluginLoader.getIdentifier().should.equal('jj.core.documentAnalyser');
		});

		it('should correctly return the main file', function () {
			var mainPath = path.resolve(pluginsFolderPath, pluginFolderName, 'lib/main.js');

			pluginLoader.getMain().should.equal(mainPath);
		});

		it('should correctly return the modules', function () {
			pluginLoader.getModules().should.containDeep([]);
		});

		it('should correctly return the name', function () {
			pluginLoader.getName().should.equal('Text-Document Analyser');
		});

		it('should correctly return the settings', function () {
			pluginLoader.getSettings().should.containDeep({ useApacheTika: true });
		});

		it('should correctly return the type', function () {
			pluginLoader.getType().should.equal('searchPlugin');
		});

		it('should correctly return the version', function () {
			pluginLoader.getVersion().should.equal('0.0.1');
		});

		it('should correctly return if the plugin is private', function () {
			pluginLoader.isPrivate().should.be.true;
		});
	});
});