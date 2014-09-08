var crypto = require('crypto');
var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

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
    function SearchRequestManager(appQuitHandler, indexName, searchClient, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The event emitter instance to trigger events.
        *
        * @see core.search.SearchRequestManager#onQueryAdd
        * @see core.search.SearchRequestManager#onQueryEnd
        * @see core.search.SearchRequestManager#onQueryRemoved
        * @see core.search.SearchRequestManager#onQueryResultsChanged
        * @see core.search.SearchRequestManager#onQueryCanceled
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
        * A flag indicates whether the SearchRequestManager is open or not.
        *
        * @member {boolean} core.search.SearchRequestManager~_isOpen
        */
        this._isOpen = false;
        /**
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
        */
        this._options = {};
        /**
        * A map of currently running search query bodies. The identifier is the `queryId` and the value the [query body]{@link http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/search-request-body.html}
        *
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_runningQueries
        */
        this._runningQueries = {};
        /**
        * A map of currently running search queries. The identifier is the `queryId and the value is the amount of results
        * that already arrived.
        *
        * @member {Object} core.search.SearchRequestManager~_runningQueries
        */
        this._runningQueryIds = {};
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

        this._createAndStoreQueryId(queryBody, function (queryId) {
            /*// add queryId to the query object
            var extendedQueryBody:Object = ObjectUtils.extend(queryBody, {
            queryId: queryId
            });*/
            _this._searchClient.createOutgoingQuery(_this._indexName, queryId, queryBody, function (err) {
                if (err) {
                    queryId = null;
                }

                internalCallback(err, queryId);

                if (queryId) {
                    _this._triggerQueryAdd(queryId, queryBody);
                }
            });
        });
    };

    SearchRequestManager.prototype.addResponse = function (queryId, responseBody, responseMeta, callback) {
        var internalCallback = callback || function (err) {
        };
        var returned = 0;
        var response = null;
        var checkAndTriggerCallback = function (err) {
            returned++;

            if (returned === response.hits.length || err) {
                returned = -1;

                return internalCallback(err);
            }
        };

        logger.log('search', 'received response', {
            queryId: queryId,
            eventName: 'RECEIVED_RESULTS'
        });

        try  {
            response = JSON.parse(responseBody.toString());
        } catch (e) {
            return internalCallback(e);
        }

        if (!(response && response.hits && response.hits.length)) {
            logger.log('search', 'SearchRequestManager#addResponse: invalid Response', {
                queryId: queryId,
                response: response
            });

            return internalCallback(null);
        }

        for (var i = 0, l = response.hits.length; i < l; i++) {
            this._checkAndAddResponse(queryId, response.hits[i], responseMeta, function (err) {
                return checkAndTriggerCallback(err);
            });
        }
    };

    SearchRequestManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.close(function (err) {
            _this._runningQueryIds = null;

            //this._eventEmitter.emit('close');
            _this._eventEmitter.removeAllListeners();
            _this._eventEmitter = null;

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

        this._searchClient.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this._searchClient.createOutgoingQueryIndex(_this._indexName, function (err) {
                if (!_this._eventEmitter) {
                    _this._eventEmitter = new events.EventEmitter();
                }

                _this._isOpen = true;

                return internalCallback(err);
            });
        });
    };

    // todo add timestamp to query to fetch just the lastest results
    SearchRequestManager.prototype.getResponses = function (queryId, callback) {
        var _this = this;
        this._getQuery(queryId, function (err, queryBody) {
            if (err) {
                return callback(err, null);
            }

            _this._searchClient.getIncomingResponses(_this._indexName, queryId, queryBody, callback);
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

    SearchRequestManager.prototype.onQueryCanceled = function (callback) {
        this._eventEmitter.addListener('queryCanceled', callback);
    };

    SearchRequestManager.prototype.queryEnded = function (queryId, reason) {
        var _this = this;
        // not found check
        if (this._runningQueryIds[queryId] === undefined) {
            return;
        }

        // trigger queryEnd event for queries with responses
        if (this._runningQueryIds[queryId]) {
            this._triggerQueryEnd(queryId, reason);
        } else {
            this._searchClient.deleteOutgoingQuery(this._indexName, queryId, function (err) {
                if (err) {
                    logger.error(err);
                }

                return _this._triggerQueryCanceled(queryId, reason);
            });
        }
    };

    SearchRequestManager.prototype.removeQuery = function (queryId, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._searchClient.deleteOutgoingQuery(this._indexName, queryId, function (err) {
            _this._triggerQueryRemoved(queryId);

            return internalCallback(err);
        });
    };

    SearchRequestManager.prototype._checkAndAddResponse = function (queryId, responseBody, responseMeta, callback) {
        var _this = this;
        if (this._runningQueryIds[queryId] === undefined) {
            logger.log('search', 'SearchRequestManager: no running query for the given queryId found', {
                queryId: queryId,
                eventName: 'QUERY_NOT_RUNNING'
            });

            return process.nextTick(callback.bind(null, null));
        }

        responseBody = this._transformResponseBody(responseBody);

        this._searchClient.checkIncomingResponse(this._indexName, queryId, responseBody, function (err, matches) {
            if (err || !(matches && matches.length)) {
                if (err) {
                    logger.error(err);
                }

                return callback(err);
            }

            _this._searchClient.addIncomingResponse(_this._indexName, queryId, responseBody, responseMeta, function (err) {
                if (err) {
                    logger.error(err);

                    return callback(err);
                }

                for (var i = 0, l = matches.length; i < l; i++) {
                    var match = matches[i];

                    if (match['_id'] !== queryId) {
                        continue;
                    }

                    callback(null);

                    if (_this._runningQueryIds[queryId] !== undefined) {
                        _this._runningQueryIds[queryId]++;

                        _this._triggerResultsChanged(queryId);
                    } else {
                        logger.log('search', 'SearchRequestManager: query is not running anymore', {
                            queryId: queryId,
                            eventName: 'QUERY_NOT_RUNNING'
                        });
                    }
                }
            });

            return callback(null);
        });
    };

    /**
    * Returns the corresponding query object to the given `queryId` from the database
    *
    * @param {string} queryId
    * @param {Function} callback
    */
    SearchRequestManager.prototype._getQuery = function (queryId, callback) {
        var _this = this;
        var cachedQueryBody = this._runningQueries[queryId];

        if (cachedQueryBody) {
            return process.nextTick(callback.bind(null, null, cachedQueryBody));
        }

        this._searchClient.getOutgoingQuery(this._indexName, queryId, function (err, queryBody) {
            _this._runningQueries[queryId] = queryBody;

            return callback(err, queryBody);
        });
    };

    /**
    * Transforms the given response from a hit object to a item that can be stored in the database.
    * Basically the `_source` key will be removed and all nested keys will be placed on the object root. Furthermore all
    * fields under the `highlight` key will be added to the object root if they do not exist yet.
    *
    * @param {Object} body A single hit from elasticsearch
    * @returns {Object} The transformed body
    */
    SearchRequestManager.prototype._transformResponseBody = function (body) {
        var keys = Object.keys(body);
        var newBody = {};

        var addToTopLevel = function (parentKey) {
            if (!body[parentKey]) {
                return;
            }

            var keys = Object.keys(body[parentKey]);
            for (var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i];

                if (newBody[key] === undefined) {
                    newBody[key] = body[parentKey][key];
                }
            }
        };

        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];

            if (['_source', 'highlight'].indexOf(key) === -1) {
                newBody[key] = body[key];
            }
        }

        if (body['_source']) {
            addToTopLevel('_source');
        }

        if (body['highlight']) {
            addToTopLevel('highlight');
        }

        return newBody;
    };

    /**
    * Removes all related data to the given `queryId` from the internal list.
    *
    * @method core.search.SearchRequestManager~_cleanupQueryLists
    *
    * @param {string} queryId
    */
    SearchRequestManager.prototype._cleanupQueryLists = function (queryId) {
        this._runningQueryIds[queryId] = null;
        this._runningQueries[queryId] = null;

        delete this._runningQueryIds[queryId];
        delete this._runningQueries[queryId];
    };

    /**
    * Creates a random queryId and exploration date and stores it in the internal lists before calling the callback with
    * the generated data as arguments.
    *
    * @method core.search.SearchRequestManager~_createAndStoreQueryId
    *
    * @param {Function} callback The callback that will be called after the generation of the data with `queryId` as first argument.
    */
    SearchRequestManager.prototype._createAndStoreQueryId = function (queryBody, callback) {
        var _this = this;
        crypto.randomBytes(16, function (ex, buf) {
            var id = buf.toString('hex');

            _this._runningQueryIds[id] = 0;

            // todo we could cache the query here and wouldn't need a single database call at all. But to prevent inconsistency the first request requires a database call.
            //this._runningQueries[id] = queryBody;
            return callback(id);
        });
    };

    /**
    * Triggers the `queryAdd` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryAdd
    *
    * @method core.search.SearchRequestManager~_triggerQueryAdd
    
    * @param {string} queryId The id of the added search query
    * @param {Object} queryBody The body of the added search query
    */
    SearchRequestManager.prototype._triggerQueryAdd = function (queryId, queryBody) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryAdd', queryId, new Buffer(JSON.stringify(queryBody)));

            logger.log('search', 'SearchRequestManager: Starting query', {
                queryId: queryId,
                queryBody: queryBody,
                eventName: 'QUERY_ADD'
            });
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
    * @param {string} reason The reason why the query was ended
    */
    SearchRequestManager.prototype._triggerQueryEnd = function (queryId, reason) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryEnd', queryId, reason);

            logger.log('search', 'SearchRequestManager: query end', {
                queryId: queryId,
                reason: reason,
                eventName: 'QUERY_END',
                resultsCount: this._runningQueryIds[queryId]
            });
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

            logger.log('search', 'SearchRequestManager: query removed', {
                queryId: queryId,
                eventName: 'QUERY_REMOVED'
            });
        }

        this._cleanupQueryLists(queryId);
    };

    /**
    * Triggers the `queryCanceled` event to registered listeners if the manager is open.
    *
    * @see core.search.SearchRequestManager#onQueryCanceled
    *
    * @method core.search.SearchRequestManager~_triggerQueryCanceled
    *
    * @param {string} queryId The id of the timed out search query
    * @param {string} reason The reason why the query was canceled.
    */
    SearchRequestManager.prototype._triggerQueryCanceled = function (queryId, reason) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryCanceled', queryId, reason);

            logger.log('search', 'SearchRequestManager: query canceled', {
                queryId: queryId,
                reason: reason,
                eventName: 'QUERY_CANCELED'
            });
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

            logger.log('search', 'SearchRequestManager: results changed', {
                queryId: queryId,
                eventName: 'RESULTS_CHANGED'
            });
        }
    };
    return SearchRequestManager;
})();

module.exports = SearchRequestManager;
//# sourceMappingURL=SearchRequestManager.js.map
