/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');

describe('CORE --> SEARCH --> SearchClient', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var searchStoreLogsFolder:string = testUtils.getFixturePath('search/searchStoreLogs');
	var searchStoreDataFolder:string = testUtils.getFixturePath('search/searchStoreData');
	var searchClient:SearchClient = null;

	this.timeout(0);

	before(function (done) {
		testUtils.createFolder(searchStoreLogsFolder);
		testUtils.createFolder(searchStoreDataFolder);

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

		searchClient = new SearchClient(config, new SearchStoreFactory(), {
			logPath       : searchStoreLogsFolder,
			onOpenCallback: function (err:Error) {
				if (err) {
					throw err;
				}
				else {
					done();
				}
			}
		});
	});

	after(function (done) {
		searchClient.close(function () {
			searchClient = null;
			testUtils.deleteFolderRecursive(searchStoreLogsFolder);
			testUtils.deleteFolderRecursive(searchStoreDataFolder);

			sandbox.restore();
			config = null;

			done();
		});
	});

	beforeEach(function (done) {
		searchClient.open(function () {
			done();
		});
	});

	it('should correctly instantiate the search client', function () {
		searchClient.should.be.an.instanceof(SearchClient);
	});

});