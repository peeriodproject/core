var PluginRunner = require('./PluginRunner');

/**
* @class core.plugin.PluginRunnerFactory
* @implements core.plugin.PluginRunnerFactoryInterface
*/
var PluginRunnerFactory = (function () {
    function PluginRunnerFactory() {
    }
    PluginRunnerFactory.prototype.create = function (config, identifier, path) {
        return new PluginRunner(config, identifier, path);
    };
    return PluginRunnerFactory;
})();

module.exports = PluginRunnerFactory;
//# sourceMappingURL=PluginRunnerFactory.js.map
