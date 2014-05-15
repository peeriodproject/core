var JSONStateHandler = require('./JSONStateHandler');

/**
* @class core.utils.JSONStateHandlerFactory
* @implements core.utils.StateHandlerFactoryInterface
*/
var JSONStateHandlerFactory = (function () {
    function JSONStateHandlerFactory() {
    }
    JSONStateHandlerFactory.prototype.create = function (path) {
        return new JSONStateHandler(path);
    };
    return JSONStateHandlerFactory;
})();

module.exports = JSONStateHandlerFactory;
//# sourceMappingURL=JSONStateHandlerFactory.js.map
