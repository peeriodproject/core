var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* QueryManagerInterface implementation.
*
* @class core.protocol.fileTransfer.QueryManager
* @extends events.EventEmitter
* @implemens core.protocol.fileTransfer.QueryManagerInterface
*
* @param {core.config.ConfigInterface} transferConfig Configuration object.
* @param {core.protocol.fileTransfer.QueryFactoryInterface} queryFactory A factory for creating query instances (hash-based or broadcast-based)
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager A working circuit manager instance for keeping track of the circuit amount.
* @param {core.search.SearchMessageBridgeInterface} searchBridge The bridge between the search manager and the network.
*/
var QueryManager = (function (_super) {
    __extends(QueryManager, _super);
    function QueryManager(transferConfig, queryFactory, circuitManager, searchBridge) {
        _super.call(this);
        /**
        * Stores the circuit manager instance.
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.QueryManager~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Keeps track of the current amount of production-ready circuits used to provide anonymity.
        *
        * @member {number} core.protocol.fileTransfer.QueryManager~_currentNumOfReadyCircuits
        */
        this._currentNumOfReadyCircuits = 0;
        /**
        * Maps the current queries to the query identifiers received from the bridge.
        *
        * @member {core.protocol.fileTransfer.QueryMap} core.protocol.fileTransfer.QueryManager~_currentQueries
        */
        this._currentQueries = {};
        /**
        * The maximum number of parallel queries, populated by config.
        *
        * @member {number} core.protocol.fileTransfer.QueryManager~_maxNumOfParallelQueries
        */
        this._maxNumOfParallelQueries = 0;
        /**
        * The minimum number of established circuits before a query can be issued, populated by config.
        *
        * @member {number} core.protocol.fileTransfer.QueryManager~_minNumOfReadyCircuits
        */
        this._minNumOfReadyCircuits = 0;
        /**
        * Stores the query factory.
        *
        * @member {core.protocol.fileTransfer.QueryFactoryInterface} core.protocol.fileTransfer.QueryManager~_queryFactory
        */
        this._queryFactory = null;
        /**
        * Stores the bridge between the search manager and the network.
        *
        * @member {core.search.SearchMessageBridgeInterface} core.protocol.fileTransfer.QueryManager~_searchBridge
        */
        this._searchBridge = null;

        this._queryFactory = queryFactory;
        this._circuitManager = circuitManager;
        this._searchBridge = searchBridge;
        this._maxNumOfParallelQueries = transferConfig.get('fileTransfer.query.maximumNumberOfParallelQueries');
        this._minNumOfReadyCircuits = transferConfig.get('fileTransfer.query.minimumNumberOfReadyCircuits');
        this._currentNumOfReadyCircuits = this._circuitManager.getReadyCircuits().length;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES
    */
    QueryManager.prototype.getQueries = function () {
        return this._currentQueries;
    };

    /**
    * END TESTING PURPOSES
    */
    /**
    * Checks if a query is possible or not, and if not, returns the reason as string.
    *
    * MAX_EXCEED: The maximum number of parallel queries is exhausted.
    * NO_ANON: There aren't enough established production-ready circuits to provide anonymity.
    *
    * If a query is possible, `null` is returned. This function gets called each time before a new query is issued.
    *
    * @method core.protocol.fileTransfer.QueryManager~_cannotQuery
    *
    * @returns {string} The reason for not being able to query, or `null` if querying is possible.
    */
    QueryManager.prototype._cannotQuery = function () {
        var ret = null;

        if (Object.keys(this._currentQueries).length >= this._maxNumOfParallelQueries) {
            return 'MAX_EXCEED';
        } else if (this._currentNumOfReadyCircuits < this._minNumOfReadyCircuits) {
            return 'NO_ANON';
        }

        return ret;
    };

    /**
    * Initializes a new query instance by adding it to the list of current queries and hooking the appropriate
    * listeners to it.
    * At last kicks off the query.
    *
    * @method core.protocol.fileTransfer.QueryManager~_initializeQuery
    *
    * @param {string} queryIdentifier The query identifier received from the bridge.
    * @param {core.protocol.fileTransfer.QueryInterface} query The query instance to intialize.
    */
    QueryManager.prototype._initializeQuery = function (queryIdentifier, query) {
        var _this = this;
        this._currentQueries[queryIdentifier] = query;

        query.once('end', function (reason) {
            if (_this._currentQueries[queryIdentifier]) {
                delete _this._currentQueries[queryIdentifier];

                query.removeAllListeners('result');
                _this._searchBridge.emit('end', queryIdentifier, reason);
            }
        });

        query.on('result', function (metadata, resultBuffer) {
            _this._searchBridge.emit('result', queryIdentifier, resultBuffer, metadata);
        });

        query.kickOff();
    };

    /**
    * Sets up the listeners on the circuit manager (getting the amount of circuits) and the bridge (new queries / manually
    * aborted queries).
    *
    * @method core.protocol.fileTransfer.QueryManager~_setupListeners
    */
    QueryManager.prototype._setupListeners = function () {
        var _this = this;
        this._circuitManager.on('circuitCount', function (count) {
            _this._currentNumOfReadyCircuits = count;
        });

        this._searchBridge.on('newBroadcastQuery', function (queryIdentifier, searchObject) {
            var reason = _this._cannotQuery();

            if (!reason) {
                var query = _this._queryFactory.constructBroadcastBasedQuery(searchObject);

                _this._initializeQuery(queryIdentifier, query);
            } else {
                setImmediate(function () {
                    _this._searchBridge.emit('end', queryIdentifier, reason);
                });
            }
        });

        this._searchBridge.on('abort', function (queryIdentifier) {
            var query = _this._currentQueries[queryIdentifier];

            if (query) {
                query.abort('MANUAL');
            }
        });
    };
    return QueryManager;
})(events.EventEmitter);

module.exports = QueryManager;
//# sourceMappingURL=QueryManager.js.map
