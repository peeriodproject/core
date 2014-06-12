/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStore', function () {
    var sandbox;
    var config;
    var appQuitHandlerStub;
    var searchStoreLogsFolder = testUtils.getFixturePath('core/search/searchStoreLogs');
    var searchStoreDataFolder = testUtils.getFixturePath('core/search/searchStoreData');
    var searchStore = null;

    this.timeout(0);

    before(function (done) {
        testUtils.createFolder(searchStoreLogsFolder);
        testUtils.createFolder(searchStoreDataFolder);

        sandbox = sinon.sandbox.create();
        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'search.binaryPath') {
                    return 'core/search/elasticsearch';
                } else if (key === 'search.pidFilename') {
                    return '../elasticsearch-pid-store';
                } else if (key === 'search.searchStoreConfig') {
                    return './config/searchStore.json';
                } else if (key === 'search.databasePath') {
                    return searchStoreDataFolder;
                }
            }
        });

        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);

        searchStore = new SearchStore(config, appQuitHandlerStub, {
            logPath: searchStoreLogsFolder,
            onOpenCallback: function (err) {
                if (err) {
                    throw err;
                } else {
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
            appQuitHandlerStub = null;

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
        searchStore.isOpen(function (err, isOpen) {
            isOpen.should.be.true;

            searchStore.close(function () {
                searchStore.close(function () {
                    searchStore.isOpen(function (err, isOpen) {
                        isOpen.should.be.false;

                        done();
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=SearchStore.js.map
