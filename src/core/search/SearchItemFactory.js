var SearchItem = require('./SearchItem');

/**
* @class core.search.SearchItemFactory
* @implements core.search.SearchItemFactoryInterface
*/
var SearchItemFactory = (function () {
    function SearchItemFactory() {
    }
    /**
    * Creates a search item instance from the given data
    *
    * todo specifiy data type
    *
    * @method core.search.SearchItemFactory#create
    *
    * @param {} data
    * @returns {core.search.SearchItemInterface}
    */
    SearchItemFactory.prototype.create = function (data) {
        return new SearchItem(data);
    };
    return SearchItemFactory;
})();

module.exports = SearchItemFactory;
//# sourceMappingURL=SearchItemFactory.js.map
