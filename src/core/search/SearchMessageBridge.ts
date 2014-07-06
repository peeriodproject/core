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
	 * @member {core.search.SearchRequestManagerInterface} core.search.SearchMessageBridge~_searchRequestManager
	 */
	private _searchRequestManager:SearchRequestManagerInterface = null;

	/**
	 *
	 * @member {core.search.SearchResponseManagerInterface} core.search.SearchMessageBridge~_searchResponseManager
	 */
	private _searchResponseManager:SearchResponseManagerInterface = null;

	constructor (searchRequestManager:SearchRequestManagerInterface, searchResponseManager:SearchResponseManagerInterface) {
		super();

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
	private _compressBuffer (buffer:Buffer, callback:(err:Error, buffer:Buffer) => any):void {
		zlib.deflateRaw(buffer, callback);
		//return process.nextTick(callback.bind(null, null, lz4.encode(buffer)));
	}

	/**
	 * Decompressed the given buffer using {@link http://nodejs.org/api/zlib.html#zlib_class_zlib_inflateraw} before calling the callback.
	 *
	 * @method core.search.SearchMessageBridge~_decompressBuffer
	 *
	 * @param {Buffer} buffer The buffer that should be decompressed
	 * @param {Function} callback The callback with a possible error and the decompressed buffer as arguments, that gets called after the buffer decompression.
	 */
	private _decompressBuffer (buffer:Buffer, callback:(err:Error, buffer:Buffer) => any):void {
		zlib.inflateRaw(buffer, callback);
		//return process.nextTick(callback.bind(null, null, lz4.decode(buffer)));
	}

	private _setupOutgoingQuery ():void {
		// query added
		this._searchRequestManager.onQueryAdd((queryId:string, queryBody:Buffer) => {
			this._compressBuffer(queryBody, (err:Error, compressedBody:Buffer) => {
				if (!err) {
					this.emit('newBroadcastQuery', queryId, compressedBody);
				}
			});
		});

		// query ended: UI
		this._searchRequestManager.onQueryRemoved((queryId:string) => {
			this.emit('abort', queryId);
		});

		// query ended: Network
		this.on('end', (queryIdentifier:string, reason:string) => {
			this._searchRequestManager.queryEnded(queryIdentifier, reason);
		});
	}

	private _setupIncomingQuery ():void {
		this.on('INCOMING_QUERY_EVENT_NAME', (queryId:string, compressedQueryBody:Buffer) => {
			this._decompressBuffer(compressedQueryBody, (err:Error, queryBody:Buffer) => {
				if (!err) {
					this._searchResponseManager.validateQueryAndTriggerResults(queryId, queryBody);
				}
			});
		})
	}

	private _setupOutgoingResults ():void {
		this._searchResponseManager.onResultsFound((queryId:string, results:Buffer) => {
			this._compressBuffer(results, (err:Error, compressedResults:Buffer) => {
				if (!err) {
					this.emit('OUTGOING_RESULTS_EVENT_NAME', queryId, compressedResults);
				}
			});
		});

		this._searchResponseManager.onNoResultsFound((queryId:string) => {
			this.emit('OUTGOING_RESULTS_EVENT_NAME', queryId, null);
		});

	}

	private _setupIncomingResults ():void {
		this.on('result', (queryIdentifier:string, responseBuffer:Buffer, metadata:Object) => {
			this._decompressBuffer(responseBuffer, (err:Error, decompressedBuffer:Buffer) => {
				if (!err) {
					this._searchRequestManager.addResponse(queryIdentifier, decompressedBuffer, metadata);
				}
			});
		});
	}

}

export = SearchMessageBridge;