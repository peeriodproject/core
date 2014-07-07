import ResponseManagerInterface = require('./interfaces/ResponseManagerInterface');
import SearchMessageBridgeInterface = require('../../../search/interfaces/SearchMessageBridgeInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import PendingQueriesList = require('./interfaces/PendingQueriesList');
import WritableQueryResponseMessageFactoryInterface = require('../messages/interfaces/WritableQueryResponseMessageFactoryInterface');

class ResponseManager implements ResponseManagerInterface {

	private _searchBridge:SearchMessageBridgeInterface = null;
	private _broadcastManager:BroadcastManagerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _circuitManager:CircuitManagerInterface = null;
	private _writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface = null;

	private _pendingBroadcastQueries:PendingQueriesList = {};

	private _externalQueryHandlers:{[identifier:string]:Function} = {};

	public constructor (transferMessageCenter:TransferMessageCenterInterface, searchBridge:SearchMessageBridgeInterface, broadcastManager:BroadcastManagerInterface, circuitManager:CircuitManagerInterface, writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface) {
		this._transferMessageCenter = transferMessageCenter;
		this._searchBridge = searchBridge;
		this._broadcastManager = broadcastManager;
		this._circuitManager = circuitManager;
		this._writableQueryResponseFactory = writableQueryResponseFactory;

		this._setupListeners();
	}

	public externalQueryHandler (identifier:string, searchObject:Buffer, callback:(identifier:string, results:Buffer) => any):void {
		this._externalQueryHandlers[identifier] = callback;
		this._searchBridge.emit('matchBroadcastQuery', identifier, searchObject);
	}

	private _setupListeners ():void {
		this._broadcastManager.on('BROADCAST_QUERY', (broadcastPayload:Buffer, broadcastId:string) => {
			// we need to extract the possible feeding nodes
			var feedingObj:any = null;
			try {
				feedingObj = FeedingNodesMessageBlock.extractAndDeconstructBlock(broadcastPayload);
			}
			catch (e) {
				return;
			}

			if (feedingObj) {
				var feedingNodesBlock:Buffer = broadcastPayload.slice(0, feedingObj.bytesRead);
				var queryBuffer:Buffer = broadcastPayload.slice(feedingObj.bytesRead);

				this._pendingBroadcastQueries[broadcastId] = feedingNodesBlock;

				this._searchBridge.emit('matchBroadcastQuery', broadcastId, queryBuffer);
			}
		});

		this._searchBridge.on('broadcastQueryResults', (identifier:string, results:Buffer) => {
			if (this._externalQueryHandlers[identifier]) {

				// we call the callback no matter what. if the results are empty, it must be handled externally
				this._externalQueryHandlers[identifier](identifier, results);
				delete this._externalQueryHandlers[identifier];
			}
			else if (this._pendingBroadcastQueries[identifier]) {
				var externalFeedingNodesBlock:Buffer = this._pendingBroadcastQueries[identifier];

				delete this._pendingBroadcastQueries[identifier];

				if (results && this._circuitManager.getReadyCircuits().length) {
					var myFeedingNodes:HydraNodeList = this._circuitManager.getRandomFeedingNodesBatch();

					var msg:Buffer = this._transferMessageCenter.wrapTransferMessage('QUERY_RESPONSE', identifier, this._writableQueryResponseFactory.constructMessage(myFeedingNodes, results));

					this._transferMessageCenter.issueExternalFeedToCircuit(externalFeedingNodesBlock, msg);
				}
			}
		});
	}

}

export = ResponseManager;