/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
    var sandbox;
    var configStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'plugin.api.basePath') {
                    return 'src/core/plugin/api';
                } else if (key === 'plugin.api.pluginApiName') {
                    return 'PluginApi.js';
                } else if (key === 'plugin.binaryPath') {
                    return './core/plugin/pluginRunner/node_v0_10_30';
                }
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly create plugin runners', function () {
        var pluginRunner = (new PluginRunnerFactory()).create(configStub, 'identifier', testUtils.getFixturePath('core/plugin/pluginRunner/emptyFile.js'));
        pluginRunner.should.be.an.instanceof(PluginRunner);
        pluginRunner.cleanup();
    });
});
//# sourceMappingURL=PluginRunnerFactory.js.map
