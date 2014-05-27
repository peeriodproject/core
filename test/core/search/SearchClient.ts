/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');

describe('CORE --> SEARCH --> SearchClient @joern', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var searchStoreLogsFolder:string = testUtils.getFixturePath('core/search/searchStoreLogs');
	var searchStoreDataFolder:string = testUtils.getFixturePath('core/search/searchStoreData');
	var searchClient:SearchClient = null;

	this.timeout(0);

	before(function (done) {
		testUtils.deleteFolderRecursive(searchStoreLogsFolder);
		testUtils.deleteFolderRecursive(searchStoreDataFolder);
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
				else if (key === 'search.pidFilename') {
					return '../elasticsearch-pid-client';
				}
				else if (key === 'search.searchStoreConfig') {
					return './config/searchStore.json';
				}
				else if (key === 'search.databasePath') {
					return searchStoreDataFolder;
				}
			}
		});

		searchClient = new SearchClient(config, 'mainIndex', new SearchStoreFactory(), {
			logsPath          : searchStoreLogsFolder,
			closeOnProcessExit: false,
			onOpenCallback    : function (err:Error) {
				if (err) {
					throw err;
				}
				else {
					return process.nextTick(done.bind(null));
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
			searchClient.deleteIndex(function () {
				done();
			});
		});
	});

	it('should correctly instantiate the search client', function () {
		searchClient.should.be.an.instanceof(SearchClient);
	});

	it('should correctly return if an item with the specified type exists', function (done) {
		searchClient.typeExists('foobar', function (exists) {
			exists.should.be.false;

			// todo add item and check again

			done();
		});
	});

	it('should correctly return if an item exists in the index', function (done) {
		var dataToIndex:Object = {
			pluginidentifier: {
				itemHash: 'fileHash',
				itemPath: '../path/file.txt',
				itemStats: {
					stats: true
				}
			}
		};

		searchClient.itemExistsById('randomId', function (exists) {
			exists.should.be.false;

			searchClient.addItem(dataToIndex, function (err:Error, ids:Array<string>) {
				searchClient.itemExistsById(ids[0], function (exists) {
					exists.should.be.true;

					done();
				});
			});
		});
	});

	it ('should correctly return the added item', function (done) {
		var dataToIndex:Object = {
			pluginidentifier: {
				itemHash: 'fileHash',
				itemPath: '../path/file.txt',
				itemStats: {
					stats: true
				}
			}
		};

		var pluginDataToIndex = {
			pluginidentifier: dataToIndex
		};

		searchClient.itemExistsById('randomId', function (exists) {
			exists.should.be.false;

			searchClient.addItem(pluginDataToIndex, function (err:Error, ids:Array<string>) {
				searchClient.getItemById(ids[0], function (err, item) {
					item['_source'].should.containDeep(dataToIndex);

					done();
				});
			});
		});
	});

	it('should correctly add an item to the datastore which uses the attachment mapper plugin', function (done) {
		var filePath:string = testUtils.getFixturePath('core/search/searchManager/Peeriod_Anonymous_decentralized_network.pdf');
		var mapping:Object = {
			"_source"   : {
				"excludes": ["file"]
			},
			"properties": {
				"file": {
					"type"          : "attachment",
					"indexed_chars" : -1,
					"detect_anguage": true,
					"fields"        : {
						"file"          : {
							"store"      : "yes",
							"term_vector": "with_positions_offsets",
							"analyzer"   : "english"
						},
						"author"        : {
							"store": "yes"
						},
						"title"         : {
							"store"   : "yes",
							"analyzer": "english"
						},
						"date"          : {
							"store": "yes"
						},
						"keywords"      : {
							"store"   : "yes",
							"analyzer": "keyword"
						},
						"content_type"  : {
							"store": "yes"
						},
						"content_length": {
							"store": "yes"
						},
						"language"      : {
							"store": "yes"
						}
					}
				}
			}
		};
		var dataToIndex:Object = {
			pluginidentifier: {
				 file: fs.readFileSync(filePath).toString('base64'),
				itemHash: 'fileHash',
				itemPath: filePath,
				itemStats: {
					stats: true
				}
			}
		};

		searchClient.addMapping('pluginidentifier', mapping, function (err:Error) {
			(err === null).should.be.true;

			searchClient.addItem(dataToIndex, function (err:Error, ids:Array<string>) {
				(err === null).should.be.true;
				(ids !== null).should.be.true;
				ids.length.should.equal(1);

				searchClient.getItemById (ids[0], function (err:Error, item:Object) {
					(err === null).should.be.true;

					var itemSource:Object = item['_source'];

					itemSource['itemPath'].should.equal(filePath);
					itemSource['itemStats'].should.containDeep({stats: true});
					itemSource['itemHash'].should.equal('fileHash');

					done();
				});
			});
		});
	});

	/*it('should correctly create an index with the specified name and handle "already exists" errors gracefully', function (done) {
	 searchClient.createIndex('foobar', function (err:Error) {
	 (err === null).should.be.true;

	 searchClient.createIndex('foobar', function (err:Error) {
	 (err === null).should.be.true;

	 done();
	 });
	 });
	 });*/

});