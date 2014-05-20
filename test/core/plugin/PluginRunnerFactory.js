/// <reference path='../../test.d.ts' />
require('should');

var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
    var sandbox;
    var configStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
    });

    afterEach(function () {
        sandbox.restore();
    });
    /*
    it ('should correctly create plugin runners', function () {
    var pluginRunner = (new PluginRunnerFactory()).create('identifier', testUtils.getFixturePath('core/plugin/pluginRunner/emptyFile.js'));
    pluginRunner.should.be.an.instanceof(PluginRunner);
    });*/
});
//# sourceMappingURL=PluginRunnerFactory.js.map
