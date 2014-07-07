var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

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
var ResponseManager = (function () {
    function ResponseManager(transferMessageCenter, searchBridge, broadcastManager, circuitManager, writableQueryResponseFactory) {
        /**
        * The broadcast manager.
        *
        * @member {core.protocol.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.ResponseManager~_broadcastManager
        */
        this._broadcastManager = null;
        /**
        * The hydra circuit manager.
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.ResponseManager~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Stores references to callbacks waiting for query responses issued externally.
        *
        * @member {core.protocol.fileTransfer.ExternalQueryHandlerList} core.protocol.fileTransfer.ResponseManager~_externalQueryHandlers
        */
        this._externalQueryHandlers = {};
        /**
        * Stores the feeding nodes byte block which was received with a search object, in order to correctly issue
        * EXTERNAL_FEEDs to the right feeding nodes belonging to a potential response.
        *
        * @member {core.protocol.fileTransfer.PendingQueryList} core.protocol.fileTransfer.ResponseManager~_pendingBroadcastQueries
        */
        this._pendingBroadcastQueries = {};
        /**
        * The bridge between search / network
        *
        * @member {core.search.SearchMessageBridgeInterface} core.protocol.fileTransfer.ResponseManager~_searchBridge
        */
        this._searchBridge = null;
        /**
        * The transfer message center.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.ResponseManager~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * The factory for QUERY_RESPONSE payloads.
        *
        * @member {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.ResponseManager~_writableQueryResponseFactory
        */
        this._writableQueryResponseFactory = null;
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
    ResponseManager.prototype.getExternalQueryHandlers = function () {
        return this._externalQueryHandlers;
    };

    ResponseManager.prototype.getPendingBroadcastQueries = function () {
        return this._pendingBroadcastQueries;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    ResponseManager.prototype.externalQueryHandler = function (identifier, searchObject, callback) {
        this._externalQueryHandlers[identifier] = callback;
        this._searchBridge.emit('matchBroadcastQuery', identifier, searchObject);
    };

    /**
    * Sets up the listeners for broadcasts and the result event from the bridge.
    * If results come through, it is checked if there is an external callback waiting for the result. If yes, call, else
    * prepare the QUERY_RESPONSE message with a random batch of feeding nodes and issue an EXTERNAL_FEED request
    * through a circuit (if present)
    *
    * @method core.protocol.fileTransfer.ResponseManager~_setupListeners
    */
    ResponseManager.prototype._setupListeners = function () {
        var _this = this;
        this._broadcastManager.on('BROADCAST_QUERY', function (broadcastPayload, broadcastId) {
            // we need to extract the possible feeding nodes
            var feedingObj = null;

            try  {
                feedingObj = FeedingNodesMessageBlock.extractAndDeconstructBlock(broadcastPayload);
            } catch (e) {
                return;
            }

            if (feedingObj) {
                var feedingNodesBlock = broadcastPayload.slice(0, feedingObj.bytesRead);
                var queryBuffer = broadcastPayload.slice(feedingObj.bytesRead);

                _this._pendingBroadcastQueries[broadcastId] = feedingNodesBlock;

                _this._searchBridge.emit('matchBroadcastQuery', broadcastId, queryBuffer);
            }
        });

        this._searchBridge.on('broadcastQueryResults', function (identifier, results) {
            if (_this._externalQueryHandlers[identifier]) {
                // we call the callback no matter what. if the results are empty, it must be handled externally
                _this._externalQueryHandlers[identifier](identifier, results);
                delete _this._externalQueryHandlers[identifier];
            } else if (_this._pendingBroadcastQueries[identifier]) {
                var externalFeedingNodesBlock = _this._pendingBroadcastQueries[identifier];

                delete _this._pendingBroadcastQueries[identifier];

                if (results && _this._circuitManager.getReadyCircuits().length) {
                    var myFeedingNodes = _this._circuitManager.getRandomFeedingNodesBatch();

                    var msg = _this._transferMessageCenter.wrapTransferMessage('QUERY_RESPONSE', identifier, _this._writableQueryResponseFactory.constructMessage(myFeedingNodes, results));

                    _this._transferMessageCenter.issueExternalFeedToCircuit(externalFeedingNodesBlock, msg);
                }
            }
        });
    };
    return ResponseManager;
})();

module.exports = ResponseManager;
//# sourceMappingURL=ResponseManager.js.map
