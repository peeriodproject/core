var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

var ResponseManager = (function () {
    function ResponseManager(transferMessageCenter, searchBridge, broadcastManager, circuitManager, writableQueryResponseFactory) {
        this._searchBridge = null;
        this._broadcastManager = null;
        this._transferMessageCenter = null;
        this._circuitManager = null;
        this._writableQueryResponseFactory = null;
        this._pendingBroadcastQueries = {};
        this._externalQueryHandlers = {};
        this._transferMessageCenter = transferMessageCenter;
        this._searchBridge = searchBridge;
        this._broadcastManager = broadcastManager;
        this._circuitManager = circuitManager;
        this._writableQueryResponseFactory = writableQueryResponseFactory;

        this._setupListeners();
    }
    ResponseManager.prototype.externalQueryHandler = function (identifier, searchObject, callback) {
        this._externalQueryHandlers[identifier] = callback;
        this._searchBridge.emit('matchBroadcastQuery', identifier, searchObject);
    };

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
