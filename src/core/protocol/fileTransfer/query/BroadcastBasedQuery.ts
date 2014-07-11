import events = require('events');
import crypto = require('crypto');

import QueryInterface = require('./interfaces/QueryInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import ReadableQueryResponseMessageInterface = require('../messages/interfaces/ReadableQueryResponseMessageInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');

var logger = require('../../../utils/logger/LoggerFactory').create();

/**
 * QueryInterface implementation based on broadcast.
 * Lets the broadcast manager ignore the generated query identifier.
 *
 * @class core.protocol.fileTransfer.BroadcastBasedQuery
 * @extends events.EventEmitter
 * @implements core.protocol.fileTransfer.QueryInterface
 *
 * @param {Buffer} searchObjectAsBuffer The object to search for in its byte buffer representation.
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} A working transfer message center instance.
 * @param {core.protocol.hydra.CircuitManagerInterface} The hydra circuit manager used to pipe the messages through.
 * @oaram {core.protocol.broadcast.BroadcastManagerInterface} A working protocol broadcast manager instance.
 * @param {number} validityNumOfMs The number of milliseconds a query should live and wait for responses before being aborted.
 */
class BroadcastBasedQuery extends events.EventEmitter implements QueryInterface {

	/**
	 * Stores the broadcast manager instance.
	 *
	 * @member {core.protocol.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_broadcastManager
	 */
	private _broadcastManager:BroadcastManagerInterface = null;

	/**
	 * Stores the hydra circuit manager instance.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Flag indicating whether this query has already been ended.
	 *
	 * @member {boolean} core.protocol.fileTransfer.BroadcastBasedQuery~_isEnded
	 */
	private _isEnded:boolean = false;

	/**
	 * The 16 byte long query identifier.
	 *
	 * @member {string} core.protocol.fileTransfer.BroadcastBasedQuery~_queryId
	 */
	private _queryId:string = null;

	/**
	 * Stores the listener function on the QUERY_RESPONSE event hooked to the transfer message center.
	 *
	 * @member {Function} core.protocol.fileTransfer.BroadcastBasedQuery~_responseListener
	 */
	private _responseListener:Function = null;

	/**
	 * The object searched for.
	 *
	 * @member {Buffer} core.protocol.fileTransfer.BroadcastBasedQuery~_searchObjectAsBuffer
	 */
	private _searchObjectAsBuffer:Buffer = null;

	/**
	 * Stores the transfer message center instance.
	 *
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * The number of milliseconds the query is valid and waits for responses.
	 *
	 * @member {number} core.protocol.fileTransfer.BroadcastBasedQuery~_validityNumOfMs
	 */
	private _validityNumOfMs:number = 0;

	/**
	 * Stores the timeout issued when the query has been sent through the circuits.
	 *
	 * @member {number|NodeJS.Timer} core.protocol.fileTransfer.BroadcastBasedQuery~_validityTimeout
	 */
	private _validityTimeout:number = 0;

	public constructor (searchObjectAsBuffer:Buffer, transferMessageCenter:TransferMessageCenterInterface, circuitManager:CircuitManagerInterface, broadcastManager:BroadcastManagerInterface, validityNumOfMs:number) {
		super();

		this._searchObjectAsBuffer = searchObjectAsBuffer;
		this._transferMessageCenter = transferMessageCenter;
		this._circuitManager = circuitManager;
		this._validityNumOfMs = validityNumOfMs;
		this._broadcastManager = broadcastManager;

		this._queryId = crypto.pseudoRandomBytes(16).toString('hex');
	}

	public abort (abortMessageCode?:string):void {
		if (!this._isEnded) {
			this._isEnded = true;

			if (this._validityTimeout) {
				global.clearTimeout(this._validityTimeout);
				this._validityTimeout = 0;
			}

			if (this._responseListener) {
				this._transferMessageCenter.removeListener('QUERY_RESPONSE_' + this._queryId, this._responseListener);
			}

			this.emit('end', abortMessageCode);
		}
	}

	public getQueryId ():string {
		return this._queryId;
	}

	public kickOff ():void {
		var queryBroadcastPayload:Buffer = this._transferMessageCenter.wrapTransferMessage('QUERY_BROADCAST', this._queryId, this._searchObjectAsBuffer);
		var allOkay:boolean = false;

		if (queryBroadcastPayload) {
			allOkay = this._circuitManager.pipeFileTransferMessageThroughAllCircuits(queryBroadcastPayload, true);
			logger.log('query', 'Piped query broadcast issuing through all circuits', {allOkay: allOkay});
		}

		if (allOkay) {
			this._broadcastManager.ignoreBroadcastId(this._queryId);

			this._validityTimeout = global.setTimeout(() => {
				this._validityTimeout = 0;
				this.abort('COMPLETE');
			}, this._validityNumOfMs);

			this._responseListener = (message:ReadableQueryResponseMessageInterface) => {
				logger.log('query', 'Received QUERY_RESPONSE', {broadcastId: this._queryId});
				this.emit('result', message.getFeedingNodes(), message.getResponseBuffer());
			}

			this._transferMessageCenter.on('QUERY_RESPONSE_' + this._queryId, this._responseListener);
		}
		else {
			this.abort('NO_ANON');
		}
	}

}

export = BroadcastBasedQuery;