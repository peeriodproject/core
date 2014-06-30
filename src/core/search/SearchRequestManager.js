var crypto = require('crypto');
var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchRequestManager
* @extends core.search.SearchRequestManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {string} indexName The name where outgoing queries and incoming responses will be stored.
* @param {core.search.SearchClientInterface} searchClient
* @param {core.utils.ClosableAsyncOptions} options
*/
var SearchRequestManager = (function () {
    function SearchRequestManager(config, appQuitHandler, indexName, searchClient, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used config instance
        *
        * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
        */
        this._config = null;
        /**
        * The event emitter instance to trigger events.
        *
        * @see core.search.SearchRequestManager#onQueryAdd
        * @see core.search.SearchRequestManager#onQueryEnd
        * @see core.search.SearchRequestManager#onQueryRemoved
        * @see core.search.SearchRequestManager#onQueryResultsChanged
        * @see core.search.SearchRequestManager#onQueryTimeout
        *
        * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * The name of the internally used index to store queries and responses in the database
        *
        * @member {string} core.search.SearchRequestManager~_indexName
        */
        this._indexName = '';
        /**
        * A flag indicates weather the SearchRequestManager is open or not.
        *
        * @member {boolean} core.search.SearchRequestManager~_isOpen
        */
        this._isOpen = false;
        /**
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
        */
        this._options = {};
        /**
        * A map of currently running search queries. The identifier is the expiry date of the stored query Object { id:string, count:number }
        *
        * @member {Object} core.search.SearchRequestManager~_runningQueries
        */
        this._runningQueryIds = {};
        /**
        * Reverse queryId lookup shortcut. The queryId is used as identifier, the expiry date is the value
        *
        * @member {Object} core.search.SearchRequestManager~_runningQueryIdMap
        */
        this._runningQueryIdMap = {};
        /**
        * The pointer to the interval that cleans up expired queries
        *
        * @member {Object} core.search.SearchRequestManager~_runningQueriesLifetimeTimeout
        */
        this._runningQueriesLifetimeTimeout = -1;
        /**
        * The internally used search client to store and load queries and results from the database
        *
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
        this._indexName = indexName.toLowerCase();
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
    SearchRequestManager.prototype.addQuery = function (queryBody, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._createAndStoreQueryId(function (id, expiryTimestamp) {
            // add queryId and expiryTimestamp to the query object
            queryBody = ObjectUtils.extend(queryBody, {
                queryId: id,
                expiryTimestamp: expiryTimestamp
            });

            _this._searchClient.createOutgoingQuery(_this._indexName, id, queryBody, function (err) {
                if (err) {
                    id = null;
                }

                internalCallback(err, id);

                if (id) {
                    _this._triggerQueryAdd(id);
                }
            });
        });
    };

    SearchRequestManager.prototype.addResponse = function (queryId, responseBody, responseMeta, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, responseMeta, function (err, response) {
            var matches;
            if (err) {
                console.error(err);
                return internalCallback(err);
            }

            if (response && response['matches'] && response['matches'].length) {
                response['matches'].forEach(function (match) {
                    var queryId = match['_id'];
                    var expiryTimestamp = _this._runningQueryIdMap[queryId];

                    if (expiryTimestamp) {
                        _this._runningQueryIds[expiryTimestamp].count++;
                    }

                    if (queryId) {
                        _this._triggerResultsChanged(queryId);
                    }
                });
            }

            return internalCallback(null);
        });
    };

    SearchRequestManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.close(function (err) {
            _this._runningQueryIds = null;
            _this._runningQueryIdMap = null;

            //this._eventEmitter.emit('close');
            _this._eventEmitter.removeAllListeners();
            _this._eventEmitter = null;

            _this._stopRunningQueriesLifetime();

            _this._isOpen = false;

            return internalCallback(err);
        });
    };

    SearchRequestManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchRequestManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._runningQueryIds = {};
        this._runningQueryIdMap = {};

        this._searchClient.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this._searchClient.createOutgoingQueryIndex(_this._indexName, function (err) {
                if (!_this._eventEmitter) {
                    _this._eventEmitter = new events.EventEmitter();
                }

                _this._startRunningQueriesLifetime();

                _this._isOpen = true;

                return internalCallback(err);
            });
        });
    };

    SearchRequestManager.prototype.onQueryAdd = function (callback) {
        this._eventEmitter.addListener('queryAdd', callback);
    };

    SearchRequestManager.prototype.onQueryEnd = function (callback) {
        this._eventEmitter.addListener('queryEnd', callback);
    };

    SearchRequestManager.prototype.onQueryRemoved = function (callback) {
        this._eventEmitter.addListener('queryRemoved', callback);
    };

    SearchRequestManager.prototype.onQueryResultsChanged = function (callback) {
        this._eventEmitter.addListener('resultsChanged', callback);
    };

    SearchRequestManager.prototype.onQueryTimeout = function (callback) {
        this._eventEmitter.addListener('queryTimeout', callback);
    };

    SearchRequestManager.prototype.removeQuery = function (queryId, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._searchClient.deleteOutgoingQuery(this._indexName, queryId, function (err) {
            _this._triggerQueryRemoved(queryId);

            //this._checkResultsAndTriggerEvent(this._runningQueryIdMap[queryId]);
            return internalCallback(err);
        });
    };

    /**
    * Checks weather the query for the given exiryTimestamp got any results yet and triggers a [`queryEnd`]{@link core.search.SearchRequestManager~_triggerQueryEnd} event if the
    * query got a response. If no results have arrived the query will be deleted from the database and a
    * [`queryTimeout`]{@link core.search.SearchRequestManager~_triggerQueryTimeout} event will be triggered afterwards.
    *
    * @method core.search.SearchRequestManager~_checkResultsAndTriggerEvent
    *
    * @param {number} expiryTimestamp
    */
    SearchRequestManager.prototype._checkResultsAndTriggerEvent = function (expiryTimestamp) {
        var _this = this;
        var queryId;

        if (!this._runningQueryIds[expiryTimestamp]) {
            return;
        }

        queryId = this._runningQueryIds[expiryTimestamp].id;

        // trigger queryEnd event for queries with responses
        if (this._runningQueryIds[expiryTimestamp].count) {
            this._triggerQueryEnd(queryId);
        } else {
            this._searchClient.deleteOutgoingQuery(this._indexName, queryId, function (err) {
                if (err) {
                    console.error(err);
                }

                return _this._triggerQueryTimeout(queryId);
            });
        }
    };

    /**
    * Removes all related data to the given `queryId` from the internal lists.
    *
    * @method core.search.SearchRequestManager~_cleanupQueryLists
    *
    * @param {string} queryId
    */
    SearchRequestManager.prototype._cleanupQueryLists = function (queryId) {
        var expiryTimestamp = this._runningQueryIdMap[queryId];

        this._runningQueryIdMap[queryId] = null;
        delete this._runningQueryIdMap[queryId];

        this._runningQueryIds[expiryTimestamp] = null;
        delete this._runningQueryIds[expiryTimestamp];
    };

    /**
    * Creates a random queryId and exploration date and stores it in the internal lists before calling the callback with
    * the generated data as arguments.
    *
    * @method core.search.SearchRequestManager~_createAndStoreQueryId
    *
    * @param callback The callback that will be called after the generation of the data with `queryId` and `expiryTimestamp` as arguments.
    */
    SearchRequestManager.prototype._createAndStoreQueryId = function (callback) {
        var _this = this;
        crypto.randomBytes(16, function (ex, buf) {
            var id = buf.toString('hex');
            var lifetime = _this._config.get('search.queryLifetimeInSeconds') * 1000;
            var expiryTimestamp = new Date().getTime() + lifetime;

            _this._runningQueryIds[expiryTimestamp] = {
                id: id,
                count: 0
            };

            _this._runningQueryIdMap[id] = expiryTimestamp;

            return callback(id, expiryTimestamp);
        });
    };

    /**
    * Iterates over the running queries and cleans up expired queries. It uses {@link core.search.SearchRequestManager~_checkResultsAndTriggerEvent}
    * to trigger a `queryTimeout` or `queryEnd` event.
    *
    * @method core.search.SearchRequestManager~_removeExpiredQueries
    */
    SearchRequestManager.prototype._removeExpiredQueries = function () {
        var _this = this;
        var now = new Date().getTime();
        var currentQueries = Object.keys(this._runningQueryIds);

        var newRunningQueryIds = {};
        currentQueries.forEach(function (expiryTimestamp) {
            // keep alive queries
            if (expiryTimestamp > now) {
                newRunningQueryIds[expiryTimestamp] = _this._runningQueryIds[expiryTimestamp];
            } else {
                _this._checkResultsAndTriggerEvent(expiryTimestamp);
            }
        });

        this._runningQueryIds = newRunningQueryIds;
    };

    /**
    * Starts the the runner that removes expired queries in a specified interval.
    *
    * @see core.search.SearchRequestManager~_removeExpiredQueries
    *
    * @method core.search.SearchRequestManager~_startRunningQueriesLifetime
    */
    SearchRequestManager.prototype._startRunningQueriesLifetime = function () {
        var _this = this;
        this._runningQueriesLifetimeTimeout = global.setTimeout(function () {
            _this._removeExpiredQueries();
            _this._startRunningQueriesLifetime();
        }, this._config.get('search.searchRequestManager.queryLifetimeIntervalInMilliSeconds'));
    };

    /**
    * Stops the interval that cleans up expired queries.
    *
    * @method core.search.SearchRequestManager~_stopRunningQueriesLifetime
    */
    SearchRequestManager.prototype._stopRunningQueriesLifetime = function () {
        if (this._runningQueriesLifetimeTimeout) {
            global.clearTimeout(this._runningQueriesLifetimeTimeout);
            this._runningQueriesLifetimeTimeout = null;
        }
    };

    /**
    * Triggers the `queryAdd` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryAdd
    *
    * @method core.search.SearchRequestManager~_triggerQueryAdd
    
    * @param {string} queryId The id of the added search query
    */
    SearchRequestManager.prototype._triggerQueryAdd = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryAdd', queryId);
        }
    };

    /**
    * Triggers the `queryEnd` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryEnd
    *
    * @method core.search.SearchRequestManager~_triggerQueryEnd
    *
    * @param {string} queryId The id of the ended search query
    */
    SearchRequestManager.prototype._triggerQueryEnd = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryEnd', queryId);
        }

        this._cleanupQueryLists(queryId);
    };

    /**
    * Triggers the `queryRemoved` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryRemoved
    *
    * @method core.search.SearchRequestManager~_triggerQueryRemoved
    *
    * @param {string} queryId The id of the removed search query
    */
    SearchRequestManager.prototype._triggerQueryRemoved = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryRemoved', queryId);
        }

        this._cleanupQueryLists(queryId);
    };

    /**
    * Triggers the `queryTimeout` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryTimeout
    *
    * @method core.search.SearchRequestManager~_triggerQueryTimeout
    *
    * @param {string} queryId The id of the timed out search query
    */
    SearchRequestManager.prototype._triggerQueryTimeout = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryTimeout', queryId);
        }

        this._cleanupQueryLists(queryId);
    };

    /**
    * Triggers the `resultsChanged` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryResultsChanged
    *
    * @method core.search.SearchRequestManager~_triggerResultsChanged
    *
    * @param {string} queryId The id of query the has updated results
    */
    SearchRequestManager.prototype._triggerResultsChanged = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('resultsChanged', queryId);
        }
    };
    return SearchRequestManager;
})();

module.exports = SearchRequestManager;
//# sourceMappingURL=SearchRequestManager.js.map
