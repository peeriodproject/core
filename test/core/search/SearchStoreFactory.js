/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchStoreFactory = require('../../../src/core/search/SearchStoreFactory');
var SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStoreFactory', function () {
    var sandbox;
    var config;
    var appQuitHandlerStub;
    var searchStoreLogsFolder = testUtils.getFixturePath('core/search/searchStoreLogs');
    var searchStoreDataFolder = testUtils.getFixturePath('core/search/searchStoreData');
    var searchStore = null;

    this.timeout(0);

    before(function (done) {
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
                    return '../elasticsearch-pid-factory';
                } else if (key === 'search.searchStoreConfig') {
                    return './config/searchStore.json';
                } else if (key === 'search.databasePath') {
                    return searchStoreDataFolder;
                }
            }
        });
        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
        searchStore = (new SearchStoreFactory()).create(config, appQuitHandlerStub, {
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
            testUtils.deleteFolderRecursive(searchStoreLogsFolder);

            try  {
                testUtils.deleteFolderRecursive(searchStoreDataFolder);
            } catch (e) {
            }

            sandbox.restore();
            config = null;
            appQuitHandlerStub = null;
            searchStore = null;

            done();
        });
    });

    it('should correctly create search store instances', function () {
        searchStore.should.be.an.instanceof(SearchStore);
    });
});
//# sourceMappingURL=SearchStoreFactory.js.map
