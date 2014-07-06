/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var zlib = require('zlib');

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
            _this._compressBuffer(queryBody, function (err, compressedBody) {
                if (!err) {
                    _this.emit('newBroadcastQuery', queryId, compressedBody);
                }
            });
        });

        // query ended: UI
        this._searchRequestManager.onQueryRemoved(function (queryId) {
            _this.emit('abort', queryId);
        });

        // query ended: Network
        this.on('end', function (queryIdentifier, reason) {
            _this._searchRequestManager.queryEnded(queryIdentifier, reason);
        });
    };

    SearchMessageBridge.prototype._setupIncomingQuery = function () {
        var _this = this;
        this.on('INCOMING_QUERY_EVENT_NAME', function (queryId, compressedQueryBody) {
            _this._decompressBuffer(compressedQueryBody, function (err, queryBody) {
                if (!err) {
                    _this._searchResponseManager.validateQueryAndTriggerResults(queryId, queryBody);
                }
            });
        });
    };

    SearchMessageBridge.prototype._setupOutgoingResults = function () {
        var _this = this;
        this._searchResponseManager.onResultsFound(function (queryId, results) {
            _this._compressBuffer(results, function (err, compressedResults) {
                if (!err) {
                    _this.emit('OUTGOING_RESULTS_EVENT_NAME', queryId, compressedResults);
                }
            });
        });

        this._searchResponseManager.onNoResultsFound(function (queryId) {
            _this.emit('OUTGOING_RESULTS_EVENT_NAME', queryId, null);
        });
    };

    SearchMessageBridge.prototype._setupIncomingResults = function () {
        var _this = this;
        this.on('result', function (queryIdentifier, responseBuffer, metadata) {
            _this._decompressBuffer(responseBuffer, function (err, decompressedBuffer) {
                if (!err) {
                    _this._searchRequestManager.addResponse(queryIdentifier, decompressedBuffer, metadata);
                }
            });
        });
    };
    return SearchMessageBridge;
})(events.EventEmitter);

module.exports = SearchMessageBridge;
//# sourceMappingURL=SearchMessageBridge.js.map