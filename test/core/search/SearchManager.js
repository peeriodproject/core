/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginManager = require('../../../src/core/plugin/PluginManager');
var SearchClient = require('../../../src/core/search/SearchClient');
var SearchManager = require('../../../src/core/search/SearchManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchManager @joern', function () {
    var sandbox;
    var createConfig = function () {
        return testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'pluginManagerStateConfig') {
                    return 'pluginManager.json';
                }
            }
        });
    };
    var closeAndDone = function (searchManager, done) {
        searchManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate SearchManager without error', function (done) {
        var configStub = createConfig();
        var pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
        var searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient);

        var searchManager = new SearchManager(configStub, pluginManagerStub, searchClientStub);
        searchManager.should.be.an.instanceof(SearchManager);

        closeAndDone(searchManager, done);
    });
});
//# sourceMappingURL=SearchManager.js.map
