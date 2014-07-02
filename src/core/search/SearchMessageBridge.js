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
    /**
    *
    * @member {zlib.Gzip} core.search.SearchMessageBridge~_compressor
    */
    /*private _compressor:zlib.DeflateRaw = null;
    
    /**
    *
    * @member {zlib.Gzip} core.search.SearchMessageBridge~_decompressor
    * /
    private _decompressor:zlib.InflateRaw = null;*/
    function SearchMessageBridge(searchRequestManager, searchResponseManager) {
        _super.call(this);
        //this._compressor = zlib.createDeflateRaw();
        //this._decompressor = zlib.createInflateRaw();
        //.emit('newBroadcastQuery', 'queryId', new Buffer(JSON.stringify({ query: { object: true }})));
    }
    SearchMessageBridge.prototype._compressBuffer = function (buffer, callback) {
        zlib.deflateRaw(buffer, callback);
        //return process.nextTick(callback.bind(null, null, lz4.encode(buffer)));
    };

    SearchMessageBridge.prototype._decompressBuffer = function (buffer, callback) {
        zlib.inflateRaw(buffer, callback);
        //return process.nextTick(callback.bind(null, null, lz4.decode(buffer)));
    };
    return SearchMessageBridge;
})(events.EventEmitter);

module.exports = SearchMessageBridge;
//# sourceMappingURL=SearchMessageBridge.js.map
