var PluginLoader = require('./PluginLoader');

/**
* @class core.plugin.PluginLoaderFactory
* @implements core.plugin.PluginLoaderFactoryInterface
*/
var PluginLoaderFactory = (function () {
    function PluginLoaderFactory() {
    }
    PluginLoaderFactory.prototype.create = function (config, path) {
        return new PluginLoader(config, path);
    };
    return PluginLoaderFactory;
})();

module.exports = PluginLoaderFactory;
//# sourceMappingURL=PluginLoaderFactory.js.map
