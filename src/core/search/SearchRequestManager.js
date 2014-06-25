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
        * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
        */
        this._config = null;
        /**
        *
        * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * @member {string} core.search.SearchRequestManager~_indexName
        */
        this._indexName = '';
        /**
        * @member {boolean} core.search.SearchRequestManager~_isOpen
        */
        this._isOpen = false;
        /**
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
        */
        this._options = {};
        /**
        * @member {Object} core.search.SearchRequestManager~_runningQueries
        */
        this._runningQueries = {};
        /**
        *
        * @member {} core.search.SearchRequestManager~_runningQueriesLifetime
        */
        this._runningQueriesLifetime = [];
        /**
        *
        * @member {Object} core.search.SearchRequestManager~_runningQueriesLifetimeTimeout
        */
        this._runningQueriesLifetimeTimeout = -1;
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

        this._createAndStoreQueryId(function (id) {
            _this._searchClient.createOutgoingQuery(_this._indexName, id, queryBody, function (err) {
                if (err) {
                    id = null;
                }

                return internalCallback(err, id);
            });
        });
    };

    SearchRequestManager.prototype.addResponse = function (queryId, responseBody, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, function (err, response) {
            var matches;
            if (err) {
                console.error(err);
                return internalCallback(err);
            }

            if (response && response['matches'] && response['matches'].length) {
                response['matches'].forEach(function (match) {
                    var queryId = match['_id'];

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
            _this._runningQueries = null;
            _this._runningQueriesLifetime = null;

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
        var done = 0;
        var triggerCallback = function (err) {
            if (!_this._eventEmitter) {
                _this._eventEmitter = new events.EventEmitter();
            }

            _this._startRunningQueriesLifetime();

            _this._isOpen = true;

            return internalCallback(err);
        };

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._runningQueries = {};
        this._runningQueriesLifetime = [];

        this._searchClient.open(function (err) {
            return triggerCallback(err);
        });
    };

    SearchRequestManager.prototype.onQueryResultsChanged = function (callback) {
        this._eventEmitter.addListener('resultsChanged', callback);
    };

    SearchRequestManager.prototype.onQueryTimeout = function (callback) {
        this._eventEmitter.addListener('queryTimeout', callback);
    };

    SearchRequestManager.prototype._createAndStoreQueryId = function (callback) {
        var _this = this;
        crypto.randomBytes(64, function (ex, buf) {
            var id = buf.toString('hex');
            var lifetime = _this._config.get('search.queryLifetimeInSeconds') * 1000;
            var expiryTimestamp = new Date().getTime() + lifetime;

            _this._runningQueries[expiryTimestamp] = {
                id: id,
                count: 0
            };
            _this._runningQueriesLifetime.push(expiryTimestamp);

            //console.log('Have %d bytes of random data: %s, %s', buf.length, buf, id);
            return callback(id);
        });
    };

    SearchRequestManager.prototype._removeOldQueries = function (lifetime) {
        var _this = this;
        var now = new Date().getTime();
        var newQueries = [];
        var newRunningQueries = {};
        var currentQueries = this._runningQueriesLifetime;

        currentQueries.forEach(function (lifetime) {
            if (lifetime > now) {
                newQueries.push(lifetime);
                newRunningQueries[lifetime] = _this._runningQueries[lifetime];
            } else {
                _this._triggerQueryTimeout(_this._runningQueries[lifetime].id);
            }
        });

        this._runningQueriesLifetime = newQueries;
        this._runningQueries = newRunningQueries;
    };

    SearchRequestManager.prototype._startRunningQueriesLifetime = function () {
        var _this = this;
        var lifetime = this._config.get('search.queryLifetimeInSeconds') * 1000;

        this._runningQueriesLifetimeTimeout = global.setTimeout(function () {
            _this._removeOldQueries(lifetime);
            _this._startRunningQueriesLifetime();
        }, this._config.get('search.searchRequestManager.queryLifetimeIntervalInMilliSeconds'));
    };

    SearchRequestManager.prototype._stopRunningQueriesLifetime = function () {
        if (this._runningQueriesLifetimeTimeout) {
            global.clearTimeout(this._runningQueriesLifetimeTimeout);
            this._runningQueriesLifetimeTimeout = null;
        }
    };

    SearchRequestManager.prototype._triggerQueryTimeout = function (queryId) {
        if (this._isOpen) {
            this._eventEmitter.emit('queryTimeout', queryId);
        }
    };

    /**
    *
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
