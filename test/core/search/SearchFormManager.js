/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var PluginManager = require('../../../src/core/plugin/PluginManager');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');
var SearchFormManager = require('../../../src/core/search/SearchFormManager');
var JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchFormManager @joern', function () {
    var sandbox;
    var configStub;
    var pluginManagerStub;
    var pluginRunnerStub;
    var stateHandlerFactoryStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return testUtils.getFixturePath('PATH/HERE');
                } else if (key === 'search.searchFormStateConfig') {
                    return 'searchFormManager.json';
                }
            }
        });
        pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
        pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
        stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory);
    });

    afterEach(function () {
        sandbox.restore();

        pluginManagerStub = null;
        pluginRunnerStub = null;
        stateHandlerFactoryStub = null;
    });

    it('should correctly instantiate SearchFormManager without error', function () {
        (new SearchFormManager(configStub, stateHandlerFactoryStub, pluginManagerStub)).should.be.an.instanceof(SearchFormManager);
    });
});
//# sourceMappingURL=SearchFormManager.js.map
