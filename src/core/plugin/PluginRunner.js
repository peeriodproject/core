/// <reference path='../../main.d.ts' />
var Sandbox = require('udibo-sandbox');

/**
* @see https://github.com/KyleJune/udibo-sandbox
*
* @class core.plugin.PluginRunner
* @implements core.plugin.PluginRunnerInterface
*/
var PluginRunner = (function () {
    function PluginRunner(identifier, path) {
        this._sandbox = null;
        this._sandbox = new Sandbox();
        this._sandbox.addVm(identifier, path);
    }
    PluginRunner.prototype.runPlugin = function (identifier) {
        this._sandbox.reload();
    };
    return PluginRunner;
})();

module.exports = PluginRunner;
//# sourceMappingURL=PluginRunner.js.map
