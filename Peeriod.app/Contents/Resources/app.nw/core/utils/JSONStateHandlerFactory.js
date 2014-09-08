var JSONStateHandler = require('./JSONStateHandler');

/**
* @class core.utils.JSONStateHandlerFactory
* @implements core.utils.StateHandlerFactoryInterface
*/
var JSONStateHandlerFactory = (function () {
    function JSONStateHandlerFactory() {
    }
    JSONStateHandlerFactory.prototype.create = function (path, fallbackPath) {
        if (typeof fallbackPath === "undefined") { fallbackPath = ''; }
        return new JSONStateHandler(path, fallbackPath);
    };
    return JSONStateHandlerFactory;
})();

module.exports = JSONStateHandlerFactory;
//# sourceMappingURL=JSONStateHandlerFactory.js.map
