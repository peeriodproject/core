var SearchStore = require('./SearchStore');

/**
* @class core.search.SearchStoreFactory
* @implements core.search.SearchStoreFactoryInterface
*/
var SearchStoreFactory = (function () {
    function SearchStoreFactory() {
    }
    /**
    * Creates a search store instance
    *
    * @method core.search.SearchStoreFactory#create
    *
    * @param {core.config.ConfigInterface} config
    * @param {core.search.SearchStoreOptions} options
    * @returns {core.search.SearchStoreInterface}
    */
    SearchStoreFactory.prototype.create = function (config, options) {
        return new SearchStore(config, options);
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
