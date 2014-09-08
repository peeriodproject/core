var SearchStore = require('./SearchStore');

/**
* @class core.search.SearchStoreFactory
* @implements core.search.SearchStoreFactoryInterface
*/
var SearchStoreFactory = (function () {
    function SearchStoreFactory() {
    }
    SearchStoreFactory.prototype.create = function (config, appQuitHandler, options) {
        return new SearchStore(config, appQuitHandler, options);
    };

    /**
    * todo check if we can remove this method
    */
    SearchStoreFactory.prototype.getDefaults = function () {
        return SearchStore.getDefaults();
    };
    return SearchStoreFactory;
})();

module.exports = SearchStoreFactory;
//# sourceMappingURL=SearchStoreFactory.js.map
