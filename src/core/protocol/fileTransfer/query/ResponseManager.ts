import ResponseManagerInterface = require('./interfaces/ResponseManagerInterface');
import SearchMessageBridgeInterface = require('../../../search/interfaces/SearchMessageBridgeInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');

class ResponseManager implements ResponseManagerInterface {

	private _searchBridge:SearchMessageBridgeInterface = null;
	private _broadcastManager:BroadcastManagerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	public constructor (transferMessageCenter:TransferMessageCenterInterface, searchBridge:SearchMessageBridgeInterface, broadcastManager:BroadcastManagerInterface) {
		this._transferMessageCenter = transferMessageCenter;
		this._searchBridge = searchBridge;
		this._broadcastManager = broadcastManager;
	}

}

export = ResponseManager;