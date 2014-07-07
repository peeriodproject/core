import ResponseManagerInterface = require('./interfaces/ResponseManagerInterface');
import SearchMessageBridgeInterface = require('../../../search/interfaces/SearchMessageBridgeInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import ExternalQueryHandlerList = require('./interfaces/ExternalQueryHandlerList');
import PendingQueryList = require('./interfaces/PendingQueryList');
import WritableQueryResponseMessageFactoryInterface = require('../messages/interfaces/WritableQueryResponseMessageFactoryInterface');

/**
 * ResponseManagerInterface implementation.
 *
 * @class core.protocol.fileTransfer.ResponseManager
 * @implements core.protocol.fileTransfer.ResponseManagerInterface
 *
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter A working transfer message center.
 * @param {core.search.SearchMessageBridgeInterface} searchBridge The bridge network / search bridge
 * @param {core.protocol.broadcast.BroadcastManagerInterface} broadcastManager A working broadcast manager
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager
 * @param {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} writableQueryResponseFactory Factory for QUERY_RESPONSE message payloads.
 */
class ResponseManager implements ResponseManagerInterface {

	/**
	 * The broadcast manager.
	 *
	 * @member {core.protocol.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.ResponseManager~_broadcastManager
	 */
	private _broadcastManager:BroadcastManagerInterface = null;

	/**
	 * The hydra circuit manager.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.ResponseManager~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Stores references to callbacks waiting for query responses issued externally.
	 *
	 * @member {core.protocol.fileTransfer.ExternalQueryHandlerList} core.protocol.fileTransfer.ResponseManager~_externalQueryHandlers
	 */
	private _externalQueryHandlers:ExternalQueryHandlerList = {};

	/**
	 * Stores the feeding nodes byte block which was received with a search object, in order to correctly issue
	 * EXTERNAL_FEEDs to the right feeding nodes belonging to a potential response.
	 *
	 * @member {core.protocol.fileTransfer.PendingQueryList} core.protocol.fileTransfer.ResponseManager~_pendingBroadcastQueries
	 */
	private _pendingBroadcastQueries:PendingQueryList = {};

	/**
	 * The bridge between search / network
	 *
	 * @member {core.search.SearchMessageBridgeInterface} core.protocol.fileTransfer.ResponseManager~_searchBridge
	 */
	private _searchBridge:SearchMessageBridgeInterface = null;

	/**
	 * The transfer message center.
	 *
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.ResponseManager~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * The factory for QUERY_RESPONSE payloads.
	 *
	 * @member {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.ResponseManager~_writableQueryResponseFactory
	 */
	private _writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface = null;

	public constructor (transferMessageCenter:TransferMessageCenterInterface, searchBridge:SearchMessageBridgeInterface, broadcastManager:BroadcastManagerInterface, circuitManager:CircuitManagerInterface, writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface) {
		this._transferMessageCenter = transferMessageCenter;
		this._searchBridge = searchBridge;
		this._broadcastManager = broadcastManager;
		this._circuitManager = circuitManager;
		this._writableQueryResponseFactory = writableQueryResponseFactory;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getExternalQueryHandlers ():ExternalQueryHandlerList {
		return this._externalQueryHandlers;
	}

	public getPendingBroadcastQueries ():PendingQueryList {
		return this._pendingBroadcastQueries;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public externalQueryHandler (identifier:string, searchObject:Buffer, callback:(identifier:string, results:Buffer) => any):void {
		this._externalQueryHandlers[identifier] = callback;
		this._searchBridge.emit('matchBroadcastQuery', identifier, searchObject);
	}

	/**
	 * Sets up the listeners for broadcasts and the result event from the bridge.
	 * If results come through, it is checked if there is an external callback waiting for the result. If yes, call, else
	 * prepare the QUERY_RESPONSE message with a random batch of feeding nodes and issue an EXTERNAL_FEED request
	 * through a circuit (if present)
	 *
	 * @method core.protocol.fileTransfer.ResponseManager~_setupListeners
	 */
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