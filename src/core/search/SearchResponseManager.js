var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

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

        this.open(this._options.onOpenCallback);
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

    SearchResponseManager.prototype.onNoResultsFound = function (callback) {
        this._eventEmitter.addListener('noResultsFound', callback);
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

    SearchResponseManager.prototype.validateQueryAndTriggerResults = function (queryId, queryBuffer, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        this._validateQuery(queryBuffer, function (err, queryObject) {
            if (err) {
                return internalCallback(err);
            }

            _this._runQuery(queryObject, function (err, results) {
                if (err) {
                    return internalCallback(err);
                }

                internalCallback(null);

                if (results && results['total']) {
                    // todo add the ability to manipulate results via plugins before the event will be triggered
                    return _this._triggerResultsFound(queryId, results);
                } else {
                    return _this._triggerNoResultsFound(queryId);
                }
            });
        });
    };

    /**
    * Queries the database with the given query and returns the results in the callback
    *
    * @method core.search.SearchResponseManager~_runQuery
    *
    * @param {Object} queryObject A valid elasticsearch query object. {@link http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/search-request-body.html}
    * @param callback The callback that gets called with a possible error and the results object as arguments after the database returned it's state.
    */
    SearchResponseManager.prototype._runQuery = function (queryObject, callback) {
        var _this = this;
        this._searchClient.search(queryObject, function (err, results) {
            var hits;

            results = results || {};
            err = err || null;
            hits = results && results.hits ? results.hits : [];

            if (err || !hits.length) {
                return callback(err, null);
            }

            results.hits = _this._cleanupHits(hits);

            delete results.max_score;

            return callback(null, results);
        });
    };

    /**
    * Removes unused fields from the result list before returning it.
    *
    * @method core.search.SearchResponseManager~_cleanupHits
    *
    * @param {Array} hits The array of hits returned from elasticsearch. {@link http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search}
    * @returns {Array}
    */
    SearchResponseManager.prototype._cleanupHits = function (hits) {
        for (var i = 0, l = hits.length; i < l; i++) {
            var hit = hits[i];

            hit._itemId = hit._source.itemHash;

            delete hit._id;
            delete hit._score;
            delete hit._index;
            delete hit._source.itemPath;

            try  {
                logger.log('search', 'SearchResponseManager: hit file:', {
                    itemName: hit._source.itemName
                });
            } catch (e) {
            }
        }

        return hits;
    };

    SearchResponseManager.prototype._triggerNoResultsFound = function (queryId) {
        if (this._isOpen) {
            logger.log('search', 'SearchResponseManager: no results found', {
                queryId: queryId,
                eventName: 'RESULTS_NOT_FOUND'
            });

            this._eventEmitter.emit('noResultsFound', queryId);
        }
    };

    /**
    * Triggers the `resultsFound` event to all registered listeners.
    *
    * @see core.search.SearchResponseManager#onResultsFound
    *
    * @method core.search.SearchResponseManager~_triggerResultsFound
    *
    * @param {string} queryId The query id where the results belong to
    * @param {Object} results The results object
    */
    SearchResponseManager.prototype._triggerResultsFound = function (queryId, results) {
        if (this._isOpen) {
            logger.log('search', 'SearchResponseManager: Results found', {
                queryId: queryId,
                eventName: 'RESULTS_FOUND',
                results: results
            });

            this._eventEmitter.emit('resultsFound', queryId, new Buffer(JSON.stringify(results)));
        }
    };

    /**
    * Validates the query by converting it to a JSON object.
    * It returns an error as the first argument if the validation failed.
    *
    * @method core.search.SearchResponseManager~_validateQuery
    *
    * @param {Buffer} queryBuffer
    * @param {Function} callback The callback that gets called after the validation finished with a possible validation error and the query object as arguments
    */
    SearchResponseManager.prototype._validateQuery = function (queryBuffer, callback) {
        var query = {};

        try  {
            query = JSON.parse(queryBuffer.toString());

            // todo limit/check valid elasticsearch keys
            return callback(null, query);
        } catch (e) {
            return callback(new Error('SearchResponseManager~_validateQuery: Could not parse the incoming query.'), null);
        }
    };
    return SearchResponseManager;
})();

module.exports = SearchResponseManager;
//# sourceMappingURL=SearchResponseManager.js.map
