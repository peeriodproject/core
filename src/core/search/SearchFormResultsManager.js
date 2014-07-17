var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SearchFormManager = require('./SearchFormManager');

/**
* @class core.search.SearchFormResultsManager
* @implements core.search.SearchFormResultsManagerInterface
* @extends core.search.SearchFormManager
*/
var SearchFormResultsManager = (function (_super) {
    __extends(SearchFormResultsManager, _super);
    function SearchFormResultsManager() {
        _super.apply(this, arguments);
    }
    return SearchFormResultsManager;
})(SearchFormManager);

module.exports = SearchFormResultsManager;
//# sourceMappingURL=SearchFormResultsManager.js.map
