/// <reference path='../../test.d.ts' />
require('should');

var fs = require('fs');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');

describe('CORE --> SEARCH --> SearchClient @joern', function () {
    var sandbox;
    var config;
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

        searchClient = new SearchClient(config, 'mainIndex', new SearchStoreFactory(), {
            logsPath: searchStoreLogsFolder,
            closeOnProcessExit: false,
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

    it('should correctly add an item to the datastore which uses the attachment mapper plugin', function (done) {
        /*var mapping = {
        "properties": {
        "content": {
        "type"  : "attachment",
        "fields": {
        "content"       : { "store": "yes", "term_vector": "with_positions_offsets"},
        "author"        : { "store": "yes" },
        "title"         : { "store": "yes", "analyzer": "english"},
        "date"          : { "store": "yes" },
        "keywords"      : { "store": "yes", "analyzer": "keyword" },
        "content_type"  : { "store": "yes" },
        "content_length": { "store": "yes" }
        }
        }
        }
        };*/
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
            pluginIdentifier: {
                file: fs.readFileSync(testUtils.getFixturePath('core/search/searchManager/Peeriod_Anonymous_decentralized_network.pdf')).toString('base64')
            }
        };

        searchClient.addMapping('pluginidentifier', mapping, function (err) {
            (err === null).should.be.true;

            searchClient.addItem(dataToIndex, function (err) {
                (err === null).should.be.true;

                done();
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
