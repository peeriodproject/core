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

    SearchStoreFactory.prototype.getDefaults = function () {
        return SearchStore.getDefaults();
    };
    return SearchStoreFactory;
})();

module.exports = SearchStoreFactory;
//# sourceMappingURL=SearchStoreFactory.js.map
