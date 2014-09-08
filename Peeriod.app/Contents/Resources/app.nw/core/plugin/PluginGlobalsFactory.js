/// <reference path='../../../ts-definitions/node/node.d.ts' />
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.plugin.PluginGlobalsFactory
* @implements core.plugin.PluginGlobalsFactoryInterface
*/
var PluginGlobalsFactory = (function () {
    function PluginGlobalsFactory() {
        this._cache = {};
    }
    /**
    * Extends the plugin globals by adding the file name nad fs.Stats object
    *
    * @method core.plugin.PluginGlobalsFactory#create
    *
    * @param {string} itemPath
    * @param {fs.Stats} stats
    * @param {Object} globals
    * @returns {Object}
    */
    PluginGlobalsFactory.prototype.create = function (itemPath, stats, globals) {
        return ObjectUtils.extend({
            fileName: path.basename(itemPath),
            fileStats: stats ? Object.freeze(stats) : {}
        }, globals);
    };
    return PluginGlobalsFactory;
})();

module.exports = PluginGlobalsFactory;
//# sourceMappingURL=PluginGlobalsFactory.js.map
