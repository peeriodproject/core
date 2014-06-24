var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchRequestManager
* @extends core.search.SearchRequestManagerInterface
*/
var SearchRequestManager = (function () {
    function SearchRequestManager(config, appQuitHandler, searchClient, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
        */
        this._config = null;
        /**
        * @member {boolean} core.search.SearchRequestManager~_isOpen
        */
        this._isOpen = false;
        /**
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
        */
        this._options = {};
        /**
        * @member {core.search.SearchClientInterface} core.search.SearchRequestManager~_searchClient
        */
        this._searchClient = null;
        var defaults = {
            onOpenCallback: function () {
            },
            onCloseCallback: function () {
            },
            closeOnProcessExit: true
        };

        this._config = config;
        this._searchClient = searchClient;
        this._options = ObjectUtils.extend(defaults, options);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open();
    }
    SearchRequestManager.prototype.addQuery = function (query, callback) {
    };

    SearchRequestManager.prototype.close = function (callback) {
        this._searchClient.close(callback);
    };

    SearchRequestManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchRequestManager.prototype.open = function (callback) {
        this._searchClient.open(callback);
    };

    SearchRequestManager.prototype.queryExists = function (callback) {
    };

    SearchRequestManager.prototype.onQueryResultsChanged = function (queryId, callback) {
    };
    return SearchRequestManager;
})();

module.exports = SearchRequestManager;
//# sourceMappingURL=SearchRequestManager.js.map
