/// <reference path='../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import zlib = require('zlib');

import SearchMessageBridgeInterface = require('./interfaces/SearchMessageBridgeInterface');

import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');
import SearchResponseManagerInterface = require('./interfaces/SearchResponseManagerInterface');

/**
 * @class core.search.SearchMessageBridge
 * @implements core.search.SearchMessageBridgeInterface
 */
class SearchMessageBridge extends events.EventEmitter implements SearchMessageBridgeInterface {

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

	constructor (searchRequestManager:SearchRequestManagerInterface, searchResponseManager:SearchResponseManagerInterface) {
		super();

		//this._compressor = zlib.createDeflateRaw();
		//this._decompressor = zlib.createInflateRaw();

		//.emit('newBroadcastQuery', 'queryId', new Buffer(JSON.stringify({ query: { object: true }})));

	}

	private _compressBuffer (buffer:Buffer, callback:(err:Error, buffer:Buffer) => any):void {
		zlib.deflateRaw(buffer, callback);
		//return process.nextTick(callback.bind(null, null, lz4.encode(buffer)));
	}

	private _decompressBuffer (buffer:Buffer, callback:(err:Error, buffer:Buffer) => any):void {
		zlib.inflateRaw(buffer, callback);
		//return process.nextTick(callback.bind(null, null, lz4.decode(buffer)));
	}

}

export = SearchMessageBridge;