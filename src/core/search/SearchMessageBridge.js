/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var zlib = require('zlib');

var logger = require('../utils/logger/LoggerFactory').create();

/**
* @class core.search.SearchMessageBridge
* @implements core.search.SearchMessageBridgeInterface
*/
var SearchMessageBridge = (function (_super) {
    __extends(SearchMessageBridge, _super);
    function SearchMessageBridge(searchRequestManager, searchResponseManager) {
        _super.call(this);
        /**
        *
        * @member {core.search.SearchRequestManagerInterface} core.search.SearchMessageBridge~_searchRequestManager
        */
        this._searchRequestManager = null;
        /**
        *
        * @member {core.search.SearchResponseManagerInterface} core.search.SearchMessageBridge~_searchResponseManager
        */
        this._searchResponseManager = null;

        this._searchRequestManager = searchRequestManager;
        this._searchResponseManager = searchResponseManager;

        this._setupOutgoingQuery();
        this._setupIncomingResults();

        this._setupIncomingQuery();
        this._setupOutgoingResults();
    }
    /**
    * Compresses the given buffer using {@link http://nodejs.org/api/zlib.html#zlib_class_zlib_deflateraw} before calling the callback.
    *
    * @method core.search.SearchMessageBridge~_compressBuffer
    *
    * @param {Buffer} buffer The buffer that should be compressed
    * @param {Function} callback The callback with a possible error and the compressed buffer as arguments, that gets called after the buffer compression.
    */
    SearchMessageBridge.prototype._compressBuffer = function (buffer, callback) {
        zlib.deflateRaw(buffer, callback);
        //return process.nextTick(callback.bind(null, null, lz4.encode(buffer)));
    };

    /**
    * Decompressed the given buffer using {@link http://nodejs.org/api/zlib.html#zlib_class_zlib_inflateraw} before calling the callback.
    *
    * @method core.search.SearchMessageBridge~_decompressBuffer
    *
    * @param {Buffer} buffer The buffer that should be decompressed
    * @param {Function} callback The callback with a possible error and the decompressed buffer as arguments, that gets called after the buffer decompression.
    */
    SearchMessageBridge.prototype._decompressBuffer = function (buffer, callback) {
        zlib.inflateRaw(buffer, callback);
        //return process.nextTick(callback.bind(null, null, lz4.decode(buffer)));
    };

    SearchMessageBridge.prototype._setupOutgoingQuery = function () {
        var _this = this;
        // query added
        this._searchRequestManager.onQueryAdd(function (queryId, queryBody) {
            /*console.log('--- 1. QUERY ADDED ---');
            console.log(queryId, queryBody.toString());
            
            setTimeout(() => {
            console.log('--- 2. INCOMING QUERY ---');
            this._searchResponseManager.validateQueryAndTriggerResults(queryId, queryBody);
            }, 1000);*/
            _this._compressBuffer(queryBody, function (err, compressedBody) {
                if (!err) {
                    logger.log('search', 'SearchMessageBridge~_setupOutgoingQuery: Emitting new broadcast query', { queryId: queryId, body: queryBody.toString() });
                    _this.emit('newBroadcastQuery', queryId, compressedBody);
                } else {
                    logger.error(err);
                }
            });
        });

        // query ended: UI
        this._searchRequestManager.onQueryRemoved(function (queryId) {
            logger.log('search', 'SearchMessageBridge~_setupOutgoingQuery: Query removed', { queryId: queryId });
            _this.emit('abort', queryId);
        });

        // query ended: Network
        this.on('end', function (queryIdentifier, reason) {
            _this._searchRequestManager.queryEnded(queryIdentifier, reason);
        });
    };

    SearchMessageBridge.prototype._setupIncomingQuery = function () {
        var _this = this;
        this.on('matchBroadcastQuery', function (queryId, compressedQueryBody) {
            _this._decompressBuffer(compressedQueryBody, function (err, queryBody) {
                if (!err) {
                    _this._searchResponseManager.validateQueryAndTriggerResults(queryId, queryBody);
                } else {
                    logger.error(err);
                }
            });
        });
    };

    SearchMessageBridge.prototype._setupOutgoingResults = function () {
        var _this = this;
        this._searchResponseManager.onResultsFound(function (queryId, results) {
            /*console.log('--- 3. RESULTS FOUND ---');
            setTimeout(() => {
            console.log('--- 4. INCOMING RESULTS ---');
            console.log(results.toString());
            this._searchRequestManager.addResponse(queryId, results, { additional: 'metadata' });
            }, 1000);*/
            _this._compressBuffer(results, function (err, compressedResults) {
                if (!err) {
                    logger.log('search', 'SearchMessageBridge~_setupOutgoingResults: Emitting broadcast query results', {
                        queryId: queryId,
                        results: results.toString()
                    });
                    _this.emit('broadcastQueryResults', queryId, compressedResults);
                } else {
                    logger.error(err);
                }
            });
        });

        this._searchResponseManager.onNoResultsFound(function (queryId) {
            logger.log('search', 'emitting broadcast query no results found', { queryId: queryId });
            _this.emit('broadcastQueryResults', queryId, null);
        });
    };

    SearchMessageBridge.prototype._setupIncomingResults = function () {
        var _this = this;
        this.on('result', function (queryIdentifier, responseBuffer, metadata) {
            _this._decompressBuffer(responseBuffer, function (err, decompressedBuffer) {
                if (!err) {
                    logger.log('search', 'a result returned from the broadcast!', {
                        queryId: queryIdentifier,
                        body: decompressedBuffer.toString()
                    });

                    _this._searchRequestManager.addResponse(queryIdentifier, decompressedBuffer, metadata);
                } else {
                    logger.error(err);
                }
            });
        });
    };
    return SearchMessageBridge;
})(events.EventEmitter);

module.exports = SearchMessageBridge;
//# sourceMappingURL=SearchMessageBridge.js.map
