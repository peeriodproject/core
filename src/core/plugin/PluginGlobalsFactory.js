/// <reference path='../../../ts-definitions/node/node.d.ts' />
var PluginGlobalsFactory = (function () {
    function PluginGlobalsFactory() {
    }
    PluginGlobalsFactory.prototype.create = function (itemPath, stats) {
        return {
            getItemFileName: function () {
                return itemPath;
            },
            getStats: function () {
                return Object.freeze(stats);
            }
        };
    };
    return PluginGlobalsFactory;
})();

module.exports = PluginGlobalsFactory;
//# sourceMappingURL=PluginGlobalsFactory.js.map
