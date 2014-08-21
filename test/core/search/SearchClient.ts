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


describe('CORE --> SEARCH --> SearchClient @joern', function () {
	var sandbox:SinonSandbox;
	var config:any;
	var appQuitHandlerStub:any;
	var searchStoreLogsFolder:string = testUtils.getFixturePath('core/search/searchStoreLogs');
	var searchStoreDataFolder:string = testUtils.getFixturePath('core/search/searchStoreData');
	var searchClient:SearchClient = null;

	this.timeout(0);

	before(function (done) {
		try {
			testUtils.deleteFolderRecursive(searchStoreDataFolder);
			testUtils.deleteFolderRecursive(searchStoreLogsFolder);
		}
		catch (e) {
		}
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
				testUtils.deleteFolderRecursive(searchStoreDataFolder);
				testUtils.deleteFolderRecursive(searchStoreLogsFolder);
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

	it('should correctly return the added item by hash', function (done) {
		var dataToIndex:Object = {
			itemHash : 'fileHash',
			itemName : 'file.txt',
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
		searchClient.getItemByHash('fileHash', function (err:Error, items:SearchItemInterface) {
			(err === null).should.be.true;
			(items === null).should.be.true;

			searchClient.addItem(pluginDataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
				searchClient.getItemByHash('fileHash', function (err, item:SearchItemInterface) {
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

	it('should correctly return the added item by id', function (done) {
		var dataToIndex:Object = {
			itemHash : 'fileHash',
			itemName : 'file.txt',
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
					item.getName().should.equal('file.txt');
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
			itemName : 'file.txt',
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
				ids.should.have.a.lengthOf(2);

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
			'_source' : {
				'excludes': ['file']
			},
			properties: {
				file: {
					type          : 'attachment',
					indexed_chars : -1,
					detect_anguage: true,
					fields        : {
						file          : {
							store      : 'yes',
							term_vector: 'with_positions_offsets',
							analyzer   : 'english'
						},
						author        : {
							store: 'yes'
						},
						title         : {
							store   : 'yes',
							analyzer: 'english'
						},
						date          : {
							store: 'yes'
						},
						keywords      : {
							store   : 'yes',
							analyzer: 'keyword'
						},
						content_type  : {
							store: 'yes'
						},
						content_length: {
							store: 'yes'
						},
						language      : {
							store: 'yes'
						}
					}
				}
			}
		};
		var dataToIndex:Object = {
			pluginidentifier: {
				file     : fs.readFileSync(filePath).toString('base64'),
				itemHash : 'fileHash',
				itemName : 'Peeriod_Anonymous_decentralized_network.pdf',
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

					item.getName().should.equal('Peeriod_Anonymous_decentralized_network.pdf');
					item.getPath().should.equal(filePath);
					item.getStats().should.containDeep({stats: true});
					item.getHash().should.equal('fileHash');

					done();
				});
			});
		});
	});

	it('should correctly create an index with not indexed meta fields in the mapping', function (done) {
		searchClient.createOutgoingQueryIndex('indexname', function (err) {
			(err === null).should.be.true;

			// todo check index fields

			done();
		});
	});

	it('should correctly create a percolate index and check the item against the running query', function (done) {
		var queryBody = {
			query: {
				match: {
					message: 'bonsai tree'
				}
			}
		};

		searchClient.createOutgoingQuery('mainindex', 'searchQueryId', queryBody, function (err) {
			(err === null).should.be.true;

			searchClient.checkIncomingResponse('mainindex', 'searchQueryId', { message: 'A new bonsai tree in the office' }, function (err, matches) {
				(err === null).should.be.true;

				matches.should.have.a.lengthOf(1);
				matches.should.containDeep([
					{
						_index: 'mainindex',
						_id   : 'searchQueryId'
					}
				]);

				done();
			});
		});
	});

	it('should correctly add a response to the database', function (done) {
		var randomQueryId = 'searchQueryId' + Math.round(Math.random() * 100000000);
		var queryBody = {
			query: {
				match: {
					message: 'bonsai tree'
				}
			}
		};

		searchClient.createOutgoingQuery('mainindex', randomQueryId, queryBody, function (err) {
			searchClient.addIncomingResponse('mainindex', randomQueryId, { message: 'A new bonsai tree in the office' }, { metadata: true }, function (err) {
				(err === null).should.be.true;

				done();
			});
		});
	});

	it('should correctly return the corresponding query object for the specified queryId', function (done) {
		var theQueryBody = {
			query: {
				match: {
					message: 'bonsai tree'
				}
			}
		};

		searchClient.createOutgoingQuery('mainindex', 'searchQueryId', theQueryBody, function (err) {
			searchClient.getOutgoingQuery('mainindex', 'searchQueryId', function (err, queryBody) {
				(err === null).should.be.true;
				queryBody.should.containDeep(theQueryBody);

				done();
			});
		});
	});

	it('should correctly return the results for the given query', function (done) {
		var randomQueryId = 'searchQueryId' + Math.round(Math.random() * 100000000);
		var queryBody = {
			query: {
				match: {
					message: 'bonsai tree'
				}
			}
		};

		var timestamp = new Date().getTime();

		searchClient.createOutgoingQueryIndex('mainindex', function (err) {
			searchClient.createOutgoingQuery('mainindex', randomQueryId, queryBody, function (err) {
				searchClient.addIncomingResponse('mainindex', randomQueryId, { message: 'A new bonsai tree in the office' }, { metadata: true }, function () {
					searchClient.getIncomingResponses('mainindex', randomQueryId, queryBody, function (err:Error, responses:any) {
						responses.total.should.equal(1);
						responses.hits.should.have.a.lengthOf(1);

						responses.hits[0].should.containDeep({
							_source: {
								message: 'A new bonsai tree in the office',
								_meta  : {
									metadata: true
								}
							}
						});

						responses.hits[0].fields._timestamp.should.be.greaterThan(timestamp);

						done();
					});
				});
			});
		});
	});

	it('should correctly return an incoming result by hash and by id', function (done) {
		var randomQueryId = 'searchQueryId' + Math.round(Math.random() * 100000000);
		var queryBody = {
			query: {
				match: {
					message: 'foobar'
				}
			}
		};
		var responseBody = {
			_type    : "jj.core.documentanalyser",
			_itemId  : "1234567890abc",
			itemName : "fileName.txt",
			itemStats: {
				stats: true
			},
			itemHash : "1234567890abc"
		};

		var item = {
			_index : "mainindex",
			_score : 1,
			_source: {
				_type    : "jj.core.documentanalyser",
				_itemId  : "1234567890abc",
				itemName : "fileName.txt",
				itemStats: {
					stats: true
				},
				itemHash : "1234567890abc",
				_meta    : {
					metadata: true
				}
			}
		};

		searchClient.createOutgoingQueryIndex('mainindex', function (err) {
			searchClient.createOutgoingQuery('mainindex', randomQueryId, queryBody, function (err) {
				searchClient.addIncomingResponse('mainindex', randomQueryId, responseBody, { metadata: true }, function () {

					searchClient.getIncomingResponseByHash('mainindex', '_all', '1234567890abc', function (err:Error, response:Object) {
						(err === null).should.be.true;

						response.should.containDeep(item);

						searchClient.getIncomingResponseById('mainindex', '_all', response['_id'], function (err:Error, response:Object) {
							(err === null).should.be.true;

							response.should.containDeep(item._source);

							done();
						});
					});
				});
			});
		});
	});

	it('should correctly remove a outgoing query and all corresponding responses from the database', function (done) {
		searchClient.deleteOutgoingQuery('myotherindex', 'searchQueryId', function (err) {
			(err === null).should.be.true;

			done();
		});
	});

	it('should correctly match the results for the given query', function (done) {
		var dataToIndex:Object = {
			pluginidentifier: {
				itemHash : 'fileHash',
				itemName : 'file.txt',
				itemPath : '../path/file.txt',
				itemStats: {
					stats: true
				},
				foo      : 'bar io'
			}
		};

		searchClient.addItem(dataToIndex, function (err:Error, ids:SearchItemIdListInterface) {
			searchClient.search({
				query: {
					match: {
						'pluginidentifier.foo': 'bar'
					}
				}
			}, function (err, results) {
				(err === null).should.be.true;

				results.should.containDeep({
					total: 1,
					hits : [
						{
							_index : 'mainindex',
							_type  : 'pluginidentifier',
							_source: {
								itemHash : 'fileHash',
								itemName : 'file.txt',
								itemPath : '../path/file.txt',
								itemStats: {
									stats: true
								},
								foo      : 'bar io'
							}
						}
					]
				});

				done();
			});
		});
	});

});