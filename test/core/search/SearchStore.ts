/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStore @joern', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var searchStoreLogsFolder:string = testUtils.getFixturePath('search/searchStoreLogs');
	var searchStoreDataFolder:string = testUtils.getFixturePath('search/searchStoreData');
	var searchStore:SearchStore = null;

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

		searchStore = new SearchStore(config, {
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

	beforeEach(function (done) {
		searchStore.open(function () {
			done();
		});
	});

	it('should correctly instantiate the search store', function () {
		searchStore.should.be.an.instanceof(SearchStore);
	});

	it('should correctly open and close the search store and return it\'s state', function (done) {
		searchStore.isOpen(function (err:Error, isOpen:boolean) {
			isOpen.should.be.true;

			searchStore.close(function () {
				searchStore.close(function () {
					searchStore.isOpen(function (err:Error, isOpen:boolean) {
						isOpen.should.be.false;

						done();
					});
				});
			});
		});
	});

});