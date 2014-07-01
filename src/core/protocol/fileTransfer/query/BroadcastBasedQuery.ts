import events = require('events');
import crypto = require('crypto');

import QueryInterface = require('./interfaces/QueryInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');

class BroadcastBasedQuery extends events.EventEmitter implements QueryInterface {

	private _queryId:string = null;
	private _searchObjectAsBuffer:Buffer = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _circuitManager:CircuitManagerInterface = null;
	private _broadcastManager:BroadcastManagerInterface = null;
	private _validityNumOfMs:number = 0;

	private _validityTimeout:number = 0;
	private _responseListener:Function = null;
	private _isEnded:boolean = false;

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
		}

		if (allOkay) {
			this._broadcastManager.ignoreBroadcastId(this._queryId);

			this._validityTimeout = global.setTimeout(() => {
				this._validityTimeout = 0;
				this.abort('COMPL');
			}, this._validityNumOfMs);

			this._responseListener = () => {
				// @todo the correct response listener with the right message type and arguments, and emit the result
			}

			this._transferMessageCenter.on('QUERY_RESPONSE_' + this._queryId, this._responseListener);
		}
		else {
			this.abort('NOANON');
		}
	}

}

export = BroadcastBasedQuery;