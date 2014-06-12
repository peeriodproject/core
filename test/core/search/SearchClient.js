/// <reference path='../../test.d.ts' />
require('should');

var fs = require('fs');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchItem = require('../../../src/core/search/SearchItem');
var SearchItemFactory = require('../../../src/core/search/SearchItemFactory');
var SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');

describe('CORE --> SEARCH --> SearchClient @_joern', function () {
    var sandbox;
    var config;
    var appQuitHandlerStub;
    var searchStoreLogsFolder = testUtils.getFixturePath('core/search/searchStoreLogs');
    var searchStoreDataFolder = testUtils.getFixturePath('core/search/searchStoreData');
    var searchClient = null;

    this.timeout(0);

    before(function (done) {
        testUtils.deleteFolderRecursive(searchStoreLogsFolder);
        testUtils.deleteFolderRecursive(searchStoreDataFolder);
        testUtils.createFolder(searchStoreLogsFolder);
        testUtils.createFolder(searchStoreDataFolder);

        sandbox = sinon.sandbox.create();
        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'search.host') {
                    return 'localhost';
                } else if (key === 'search.port') {
                    return 9200;
                } else if (key === 'search.binaryPath') {
                    return 'core/search/elasticsearch';
                } else if (key === 'search.pidFilename') {
                    return '../elasticsearch-pid-client';
                } else if (key === 'search.searchStoreConfig') {
                    return './config/searchStore.json';
                } else if (key === 'search.databasePath') {
                    return searchStoreDataFolder;
                }
            }
        });

        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);

        searchClient = new SearchClient(config, appQuitHandlerStub, 'mainIndex', new SearchStoreFactory(), new SearchItemFactory(), {
            logsPath: searchStoreLogsFolder,
            onOpenCallback: function (err) {
                if (err) {
                    throw err;
                } else {
                    return process.nextTick(done.bind(null));
                }
            }
        });
    });

    after(function (done) {
        searchClient.close(function () {
            searchClient = null;
            try  {
                testUtils.deleteFolderRecursive(searchStoreLogsFolder);
                testUtils.deleteFolderRecursive(searchStoreDataFolder);
            } catch (e) {
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
        var dataToIndex = {
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

            searchClient.addItem(dataToIndex, function (err, ids) {
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
        var dataToIndex = {
            itemHash: 'fileHash',
            itemPath: '../path/file.txt',
            itemStats: {
                stats: true
            }
        };

        var pluginDataToIndex = {
            pluginidentifier: dataToIndex,
            pluginidentifier2: dataToIndex
        };

        searchClient.itemExistsById('randomId', function (exists) {
            exists.should.be.false;

            searchClient.addItem(pluginDataToIndex, function (err, ids) {
                searchClient.getItemById(ids[0], function (err, item) {
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
        var dataToIndex = {
            itemHash: 'fileHash',
            itemPath: '../path/file.txt',
            itemStats: {
                stats: true
            },
            foo: 'bar'
        };

        var pluginDataToIndex = {
            pluginidentifier: dataToIndex,
            pluginidentifier2: dataToIndex
        };
        searchClient.getItemByPath('../path/file.txt', function (err, items) {
            (err === null).should.be.true;
            (items === null).should.be.true;

            searchClient.addItem(pluginDataToIndex, function (err, ids) {
                searchClient.getItemByPath('../path/file.txt', function (err, item) {
                    var identifiers = item.getPluginIdentifiers();

                    identifiers.length.should.equal(2);

                    for (var i in identifiers) {
                        var identifier = identifiers[i];

                        item.getPluginData(identifier).should.containDeep({ foo: 'bar' });
                    }

                    done();
                });
            });
        });
    });

    it('should correctly add an item to the datastore which uses the attachment mapper plugin', function (done) {
        var filePath = testUtils.getFixturePath('core/search/searchManager/Peeriod_Anonymous_decentralized_network.pdf');
        var mapping = {
            "_source": {
                "excludes": ["file"]
            },
            "properties": {
                "file": {
                    "type": "attachment",
                    "indexed_chars": -1,
                    "detect_anguage": true,
                    "fields": {
                        "file": {
                            "store": "yes",
                            "term_vector": "with_positions_offsets",
                            "analyzer": "english"
                        },
                        "author": {
                            "store": "yes"
                        },
                        "title": {
                            "store": "yes",
                            "analyzer": "english"
                        },
                        "date": {
                            "store": "yes"
                        },
                        "keywords": {
                            "store": "yes",
                            "analyzer": "keyword"
                        },
                        "content_type": {
                            "store": "yes"
                        },
                        "content_length": {
                            "store": "yes"
                        },
                        "language": {
                            "store": "yes"
                        }
                    }
                }
            }
        };
        var dataToIndex = {
            pluginidentifier: {
                file: fs.readFileSync(filePath).toString('base64'),
                itemHash: 'fileHash',
                itemPath: filePath,
                itemStats: {
                    stats: true
                }
            }
        };

        searchClient.addMapping('pluginidentifier', mapping, function (err) {
            (err === null).should.be.true;

            searchClient.addItem(dataToIndex, function (err, ids) {
                (err === null).should.be.true;
                (ids !== null).should.be.true;
                ids.length.should.equal(1);

                searchClient.getItemById(ids[0], function (err, item) {
                    (err === null).should.be.true;

                    item.should.be.an.instanceof(SearchItem);

                    item.getPath().should.equal(filePath);
                    item.getStats().should.containDeep({ stats: true });
                    item.getHash().should.equal('fileHash');

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
//# sourceMappingURL=SearchClient.js.map
