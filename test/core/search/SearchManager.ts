/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchManagerInterface = require('../../../src/core/search/interfaces/SearchManagerInterface');

import PluginManager = require('../../../src/core/plugin/PluginManager');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchManager = require('../../../src/core/search/SearchManager');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchManager @joern', function () {
	var sandbox:SinonSandbox;
	var createConfig:any = function ():any {
		return testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'pluginManagerStateConfig') {
					return 'pluginManager.json';
				}
			}
		});
	};
	var closeAndDone = function (searchManager, done) {
		searchManager.close(function () {
			done();
		});
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
	});

	afterEach(function () {
		sandbox.restore();
	});

	it('should correctly instantiate SearchManager without error', function (done) {
		var configStub = createConfig();
		var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
		var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient);

		var searchManager:SearchManagerInterface = new SearchManager(configStub, pluginManagerStub, searchClientStub);
		searchManager.should.be.an.instanceof(SearchManager);

		closeAndDone(searchManager, done);
	});

	it('should correctly call the addItem method', function (done) {
		var configStub = createConfig();
		var pluginsMapping:Object = {
			'foo bar active': {
				textdocument: {
					properties: {
						file_attachment: {
							type: 'attachment'
						}
					}
				}
			}
		};

		var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
			onBeforeItemAdd: function (itemPath, stats, callback) {
				itemPath.should.equal('/path/to/item');
				stats.should.containDeep(JSON.parse(statsJson));

				callback(pluginsMapping);
			}
		});
		var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {
			addItem: function (item, stats, callback) {
				callback(null);
			}
		});
		var statsJson:string = '{"dev":16777222," mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';

		var searchManager:SearchManagerInterface = new SearchManager(configStub, pluginManagerStub, searchClientStub);

		searchManager.addItem('/path/to/item', JSON.parse(statsJson), function (err) {
			(err === null).should.be.true;

			pluginManagerStub.onBeforeItemAdd.calledOnce.should.be.true;
			searchClientStub.addItem.calledOnce.should.be.true;
			pluginManagerStub.onBeforeItemAdd.calledBefore(searchClientStub.addItem).should.be.true;

			// todo test pluginDatas passed to searchClient

			closeAndDone(searchManager, done);
		});
	});

	it ('should correctly create a mapping for the given plugin identifier if it does not exists', function (done) {
		var configStub = createConfig();
		var pluginMapping = {
			textdocument: {
				properties: {
					file_attachment: {
						type: 'attachment'
					}
				}
			}
		};
		var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
			getMapping: function(callback) {
				callback(pluginMapping);
			}
		});
		var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
			addEventListener: function(eventName, listener) {
				return process.nextTick(listener.bind(null, 'pluginIdentifier'));
			},
			getActivePluginRunner: function (identifier, callback) {
				callback(pluginRunnerStub);
			}
		});
		var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {
			typeExists: function (identifier, callback) {
				identifier.should.equal('pluginIdentifier');
				callback(false);
			},
			addMapping: function (pluginIdentifier, mapping, callback) {
				pluginIdentifier.should.equal('pluginIdentifier');
				mapping.should.containDeep(pluginMapping);

				closeAndDone(searchManager, done);

			}
		});

		var searchManager:SearchManagerInterface = new SearchManager(configStub, pluginManagerStub, searchClientStub);

	});

});