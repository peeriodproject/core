var PluginRunner = require('./PluginRunner');

/**
* @class core.plugin.PluginRunnerFactory
* @implements core.plugin.PluginRunnerFactoryInterface
*/
var PluginRunnerFactory = (function () {
    function PluginRunnerFactory() {
    }
    PluginRunnerFactory.prototype.create = function (identifier, path) {
        return new PluginRunner(identifier, path);
    };
    return PluginRunnerFactory;
})();

module.exports = PluginRunnerFactory;
//# sourceMappingURL=PluginRunnerFactory.js.map
