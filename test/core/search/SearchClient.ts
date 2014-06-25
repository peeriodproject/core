/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchItemIdListInterface = require('../../../src/core/search/interfaces/SearchItemIdListInterface');
import SearchItemInterface = require('../../../src/core/search/interfaces/SearchItemInterface');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchItem = require('../../../src/core/search/SearchItem');
import SearchItemFactory = require('../../../src/core/search/SearchItemFactory');
import SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');


describe('CORE --> SEARCH --> SearchClient', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var appQuitHandlerStub:any;
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
				if (key === 'search.apiVersion') {
					return '1.2';
				}
				else if (key === 'search.host') {
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

		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);

		searchClient = new SearchClient(config, appQuitHandlerStub, 'mainIndex', new SearchStoreFactory(), new SearchItemFactory(), {
			logsPath      : searchStoreLogsFolder,
			onOpenCallback: function (err:Error) {
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
			try {
				//testUtils.deleteFolderRecursive(searchStoreLogsFolder);
				testUtils.deleteFolderRecursive(searchStoreDataFolder);
			}
			catch (e) {
				console.log(e);
			}

			sandbox.restore();
			config = null;
			appQuitHandlerStub = null;

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

	it('should correctly return the open/closed state', function (done) {
		searchClient.isOpen(function (err, isOpen) {
			(err === null).should.be.true;
			isOpen.should.be.true;

			searchClient.close(function (err) {
				searchClient.isOpen(function (err, isOpen) {
					(err === null).should.be.true;
					isOpen.should.be.false;

					done();
				});
			});
		});
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
				itemHash : 'fileHash',
				itemPath : '../path/file.txt',
				itemStats: {
					stats: true
				}
			}
		};

		searchClient.itemExistsById('randomId', function (exists) {
			exists.should.be.false;

			searchClient.addItem(dataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
				searchClient.itemExistsById(ids[0], function (exists) {
					exists.should.be.true;

					done();
				});
			});
		});
	});

	it('should correctly prevent the creation of empty items', function (done) {
		searchClient.addItem({}, function (err, ids) {
			err.should.be.an.instanceof(Error);
			err.message.should.equal('SearchClient.addItem: No item data specified! Preventing item creation.');
			(ids === null).should.be.true;

			done();
		});
	});

	it('should correctly return the added item by id', function (done) {
		var dataToIndex:Object = {
			itemHash : 'fileHash',
			itemPath : '../path/file.txt',
			itemStats: {
				stats: true
			}

		};

		var pluginDataToIndex = {
			pluginidentifier : dataToIndex,
			pluginidentifier2: dataToIndex
		};

		searchClient.itemExistsById('randomId', function (exists) {
			exists.should.be.false;

			searchClient.addItem(pluginDataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
				searchClient.getItemById(ids[0], function (err:Error, item:SearchItemInterface) {
					item.should.be.an.instanceof(SearchItem);

					item.getHash().should.equal('fileHash');
					item.getPath().should.equal('../path/file.txt');
					item.getStats().should.containDeep({ stats: true });

					done();
				});
			});
		});
	});

	it('should correctly return the added item by path', function (done) {
		var dataToIndex:Object = {
			itemHash : 'fileHash',
			itemPath : '../path/file.txt',
			itemStats: {
				stats: true
			},
			foo      : 'bar'
		};

		var pluginDataToIndex = {
			pluginidentifier : dataToIndex,
			pluginidentifier2: dataToIndex
		};
		searchClient.getItemByPath('../path/file.txt', function (err:Error, items:SearchItemInterface) {
			(err === null).should.be.true;
			(items === null).should.be.true;

			searchClient.addItem(pluginDataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
				searchClient.getItemByPath('../path/file.txt', function (err, item:SearchItemInterface) {
					var identifiers = item.getPluginIdentifiers();

					identifiers.length.should.equal(2);

					for (var i in identifiers) {
						var identifier:string = identifiers[i];

						item.getPluginData(identifier).should.containDeep({ foo: 'bar' });
					}

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
				file     : fs.readFileSync(filePath).toString('base64'),
				itemHash : 'fileHash',
				itemPath : filePath,
				itemStats: {
					stats: true
				}
			}
		};

		searchClient.addMapping('pluginidentifier', mapping, function (err:Error) {
			(err === null).should.be.true;

			searchClient.addItem(dataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
				(err === null).should.be.true;
				(ids !== null).should.be.true;
				ids.length.should.equal(1);

				searchClient.getItemById(ids[0], function (err:Error, item:SearchItemInterface) {
					(err === null).should.be.true;

					item.should.be.an.instanceof(SearchItem);

					item.getPath().should.equal(filePath);
					item.getStats().should.containDeep({stats: true});
					item.getHash().should.equal('fileHash');

					done();
				});
			});
		});
	});

	it('should correctly create a percolate index and add an item to the index', function (done) {
		var queryBody = {
			// This query will be run against documents sent to percolate
			query: {
				match: {
					message: "bonsai tree"
				}
			}
		};

		searchClient.createOutgoingQuery('myindex', 'searchQueryId', queryBody, function (err) {
			console.log(err);
			(err === null).should.be.true;

			searchClient.addIncomingResponse('myindex', 'searchQueryId', { message: 'A new bonsai tree in the office' }, function (err, response) {
				console.log(err);
				(err === null).should.be.true;

				response.should.containDeep({
					total  : 1,
					matches: [
						{
							_index: 'myindex',
							_id   : 'searchQueryId'
						}
					]
				});

				done();
			});
		});
	});

});