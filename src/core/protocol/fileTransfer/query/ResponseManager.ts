import ResponseManagerInterface = require('./interfaces/ResponseManagerInterface');
import SearchMessageBridgeInterface = require('../../../search/interfaces/SearchMessageBridgeInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

class ResponseManager implements ResponseManagerInterface {

	private _searchBridge:SearchMessageBridgeInterface = null;
	private _broadcastManager:BroadcastManagerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _circuitManager:CircuitManagerInterface = null;

	public constructor (transferMessageCenter:TransferMessageCenterInterface, searchBridge:SearchMessageBridgeInterface, broadcastManager:BroadcastManagerInterface, circuitManager:CircuitManagerInterface) {
		this._transferMessageCenter = transferMessageCenter;
		this._searchBridge = searchBridge;
		this._broadcastManager = broadcastManager;
		this._circuitManager = circuitManager;

		this._setupListeners();
	}

	private _setupListeners ():void {
		this._broadcastManager.on('BROADCAST_QUERY', (broadcastPayload:Buffer, broadcastId:string) => {

		});
	}

}

export = ResponseManager;