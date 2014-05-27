var SearchItem = require('./SearchItem');

/**
* @class core.search.SearchItemFactory
* @implements core.search.SearchItemFactoryInterface
*/
var SearchItemFactory = (function () {
    function SearchItemFactory() {
    }
    SearchItemFactory.prototype.create = function (data) {
        return new SearchItem(data);
    };
    return SearchItemFactory;
})();

module.exports = SearchItemFactory;
//# sourceMappingURL=SearchItemFactory.js.map
