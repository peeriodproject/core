/// <reference path='../../main.d.ts' />
/**
* @interface
* @class core.plugin.PluginValidator
*/
var PluginValidator = (function () {
    function PluginValidator() {
    }
    PluginValidator.prototype.validateState = function (pluginState, callback) {
        // dummy method
        return process.nextTick(callback.bind(null, null));
    };
    return PluginValidator;
})();

module.exports = PluginValidator;
//# sourceMappingURL=PluginValidator.js.map
