/// <reference path='../../test.d.ts' />
require('should');
var testUtils = require('../../utils/testUtils');

var PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
    it('should correctly create plugin runners', function () {
        var pluginRunner = (new PluginRunnerFactory()).create('identifier', testUtils.getFixturePath('/plugin/pluginRunner/emptyFile.js'));
        pluginRunner.should.be.an.instanceof(PluginRunner);
    });
});
//# sourceMappingURL=PluginRunnerFactory.js.map
