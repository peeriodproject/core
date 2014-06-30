var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchResponseManager
* @implements core.searchSearchResponseManagerInterface
*
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.search.SearchClientInterface} searchClient
* @param {core.utils.ClosableAsyncOptions} options
*/
var SearchResponseManager = (function () {
    function SearchResponseManager(appQuitHandler, searchClient, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The event emitter instance to trigger the `resultsFound` event.
        *
        * @see core.search.SearchResponeManager#onResultsFound
        *
        * @member {core.config.ConfigInterface} core.search.SearchResponseManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * A flag indicates weather the SearchResponseManager is open or not.
        *
        * @member {boolean} core.search.SearchResponseManager~_isOpen
        */
        this._isOpen = false;
        /**
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
        */
        this._options = {};
        /**
        * The internally used search client to validate queries.
        *
        * @member {core.search.SearchClientInterface} core.search.SearchResponseManager~_searchClient
        */
        this._searchClient = null;
        var defaults = {
            onOpenCallback: function () {
            },
            onCloseCallback: function () {
            },
            closeOnProcessExit: true
        };

        this._searchClient = searchClient;
        this._options = ObjectUtils.extend(defaults, options);

        this._eventEmitter = new events.EventEmitter();

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }
    }
    SearchResponseManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.close(function (err) {
            //this._eventEmitter.emit('close');
            _this._eventEmitter.removeAllListeners();
            _this._eventEmitter = null;

            _this._isOpen = false;

            return internalCallback(err);
        });
    };

    SearchResponseManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchResponseManager.prototype.onResultsFound = function (callback) {
        this._eventEmitter.addListener('resultsFound', callback);
    };

    SearchResponseManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            if (!_this._eventEmitter) {
                _this._eventEmitter = new events.EventEmitter();
            }

            _this._isOpen = true;

            return internalCallback(err);
        });
    };

    SearchResponseManager.prototype.valiateQueryAndTriggerResults = function (queryId, query, callback) {
    };
    return SearchResponseManager;
})();

module.exports = SearchResponseManager;
//# sourceMappingURL=SearchResponseManager.js.map
