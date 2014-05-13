/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchStoreInterface = require('../../../src/core/search/interfaces/SearchStoreInterface');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');
import SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStoreFactory', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var searchStoreLogsFolder:string = testUtils.getFixturePath('search/searchStoreLogs');
	var searchStoreDataFolder:string = testUtils.getFixturePath('search/searchStoreData');
	var searchStore:SearchStoreInterface = null;

	before(function (done) {
		sandbox = sinon.sandbox.create();
		config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key):any {
				if (key === 'search.host') {
					return 'localhost';
				}
				else if (key === 'search.port') {
					return 9200;
				}
				else if (key === 'search.binaryPath') {
					return 'core/search/elasticsearch'
				}
				else if (key === 'search.searchStoreConfig') {
					return './config/searchStore.json';
				}
				else if (key === 'search.databasePath') {
					return searchStoreDataFolder;
				}
			}
		});
		searchStore = (new SearchStoreFactory()).create(config, {
			logPath       : searchStoreLogsFolder,
			onOpenCallback: function (err:Error) {
				if (err) {
					throw err
				}
				else {
					done();
				}
			}
		});
	});

	after(function (done) {
		searchStore.close(function () {
			searchStore = null;
			testUtils.deleteFolderRecursive(searchStoreLogsFolder);
			testUtils.deleteFolderRecursive(searchStoreDataFolder);

			sandbox.restore();
			config = null;

			done();
		});
	});

	it ('should correctly create search store instances', function () {
		searchStore.should.be.an.instanceof(SearchStore);
	});

});