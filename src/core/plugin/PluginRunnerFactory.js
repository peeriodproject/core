var FileBlockReaderFactory = require('../fs/FileBlockReaderFactory');
var PluginRunner = require('./PluginRunner');

/**
* @class core.plugin.PluginRunnerFactory
* @implements core.plugin.PluginRunnerFactoryInterface
*/
var PluginRunnerFactory = (function () {
    function PluginRunnerFactory() {
        this._fileBlockReaderFactory = null;
        this._fileBlockReaderFactory = new FileBlockReaderFactory();
    }
    PluginRunnerFactory.prototype.create = function (config, identifier, path) {
        return new PluginRunner(config, identifier, path, this._fileBlockReaderFactory);
    };
    return PluginRunnerFactory;
})();

module.exports = PluginRunnerFactory;
//# sourceMappingURL=PluginRunnerFactory.js.map
