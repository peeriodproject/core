/// <reference path='../../test.d.ts' />
require('should');

var PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
    it('should correctly create plugin runners', function () {
        var pluginRunner = (new PluginRunnerFactory()).create('identifier', '/path/to/runnable/file.js');
        pluginRunner.should.be.an.instanceof(PluginRunner);
    });
});
//# sourceMappingURL=PluginRunnerFactory.js.map
