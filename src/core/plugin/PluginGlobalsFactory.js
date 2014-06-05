/// <reference path='../../../ts-definitions/node/node.d.ts' />
var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.plugin.PluginGlobalsFactory
* @implements core.plugin.PluginGlobalsFactoryInterface
*
* @param {string} itemPath
* @param {fs.Stats} stats
* @param {Object} globals
*/
var PluginGlobalsFactory = (function () {
    function PluginGlobalsFactory() {
        this._cache = {};
    }
    PluginGlobalsFactory.prototype.create = function (itemPath, stats, globals) {
        return ObjectUtils.extend({
            fileName: itemPath,
            fileStats: stats ? Object.freeze(stats) : stats
        }, globals);
    };
    return PluginGlobalsFactory;
})();

module.exports = PluginGlobalsFactory;
//# sourceMappingURL=PluginGlobalsFactory.js.map
