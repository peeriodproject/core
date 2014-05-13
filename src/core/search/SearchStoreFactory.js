var SearchStore = require('./SearchStore');

/**
* @class core.search.SearchStoreFactory
* @implements core.search.SearchStoreFactoryInterface
*/
var SearchStoreFactory = (function () {
    function SearchStoreFactory() {
    }
    SearchStoreFactory.prototype.create = function (config, options) {
        return new SearchStore(config, options);
    };
    return SearchStoreFactory;
})();

module.exports = SearchStoreFactory;
//# sourceMappingURL=SearchStoreFactory.js.map
