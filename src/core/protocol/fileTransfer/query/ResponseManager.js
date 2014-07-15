var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

var logger = require('../../../utils/logger/LoggerFactory').create();

/**
* ResponseManagerInterface implementation.
*
* @class core.protocol.fileTransfer.ResponseManager
* @implements core.protocol.fileTransfer.ResponseManagerInterface
*
* @param {core.config.ConfigInterface} transferConfig File transfer configuration
* @param {core.protocol.hydra.CellManagerInterface} cellManager Working hydra cell manager
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter A working transfer message center.+
* @param {core.search.SearchMessageBridgeInterface} searchBridge The bridge network / search bridge
* @param {core.protocol.broadcast.BroadcastManagerInterface} broadcastManager A working broadcast manager
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager
* @param {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} writableQueryResponseFactory Factory for QUERY_RESPONSE message payloads.
*/
var ResponseManager = (function () {
    function ResponseManager(transferConfig, cellManager, transferMessageCenter, searchBridge, broadcastManager, circuitManager, writableQueryResponseFactory) {
        /**
        * The broadcast manager.
        *
        * @member {core.protocol.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.ResponseManager~_broadcastManager
        */
        this._broadcastManager = null;
        /**
        * The hydra cell manager.
        *
        * @member {core.protocol.hydra.CelLManagerInterface} core.protocol.fileTransfer.ResponseManager~_cellManager
        */
        this._cellManager = null;
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
        * If a query comes through a circuit with the intention to initiate a broadcast (as this node is part of a circuit), this
        * number indicates the maximum number of milliseconds the node will wait after the broadcast initiation before it pipes its own
        * response through the circuit. This is to obfuscate the source of the own response.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.ResponseManager~_waitForOwnResponseAsBroadcastInitiatorInMs
        */
        this._waitForOwnResponseAsBroadcastInitiatorInMs = null;
        /**
        * The factory for QUERY_RESPONSE payloads.
        *
        * @member {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.ResponseManager~_writableQueryResponseFactory
        */
        this._writableQueryResponseFactory = null;
        this._cellManager = cellManager;
        this._transferMessageCenter = transferMessageCenter;
        this._searchBridge = searchBridge;
        this._broadcastManager = broadcastManager;
        this._circuitManager = circuitManager;
        this._writableQueryResponseFactory = writableQueryResponseFactory;
        this._waitForOwnResponseAsBroadcastInitiatorInMs = transferConfig.get('fileTransfer.response.waitForOwnResponseAsBroadcastInitiatorInSeconds') * 1000;

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
    * Moreover a listener is set on the transfer message center's 'issueBroadcastQuery' event, which gets emitted when
    * a instruction comes through a cell to initialize a broadcast query with the given search object. A broadcast is
    * initialized with this node's own external address as feeding nodes block (as of course this node needs to accept and pipe
    * back results). The node's OWN results are piped back through the circuit the QUERY_BROADCAST message came through after
    * a random timeout, in order to prevent very simple timing based prediction of the results' source.
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
            logger.log('query', 'Received broadcast query results from bridge', { broadcastId: identifier });

            if (_this._externalQueryHandlers[identifier]) {
                // we call the callback no matter what. if the results are empty, it must be handled externally
                _this._externalQueryHandlers[identifier](identifier, results);
                delete _this._externalQueryHandlers[identifier];
            } else if (_this._pendingBroadcastQueries[identifier]) {
                var externalFeedingNodesBlock = _this._pendingBroadcastQueries[identifier];

                delete _this._pendingBroadcastQueries[identifier];

                if (results) {
                    logger.log('query', 'Wrapping query response message', { broadcastId: identifier });

                    var msg = _this._wrapQueryResponse(identifier, results);

                    if (msg) {
                        var result = _this._transferMessageCenter.issueExternalFeedToCircuit(externalFeedingNodesBlock, msg);
                        logger.log('query', 'Issuing external feed to circuit', { broadcastId: identifier, result: result });
                    }
                }
            }
        });

        this._transferMessageCenter.on('issueBroadcastQuery', function (predecessorCircuitId, broadcastId, searchObject, myFeedingBlock) {
            // start a broadcast but answer to the query by yourself after a given time
            var broadcastPayload = Buffer.concat([myFeedingBlock, searchObject]);

            logger.log('query', 'Starting a broadcast', { queryId: broadcastId });

            _this._broadcastManager.initBroadcast('BROADCAST_QUERY', broadcastPayload, broadcastId);

            _this.externalQueryHandler(broadcastId, searchObject, function (identifier, results) {
                if (results) {
                    logger.log('query', 'Issuing result back through circuit', { broadcastId: identifier });

                    var msg = _this._wrapQueryResponse(identifier, results);

                    if (msg) {
                        setTimeout(function () {
                            _this._cellManager.pipeFileTransferMessage(predecessorCircuitId, msg);
                        }, Math.random() * _this._waitForOwnResponseAsBroadcastInitiatorInMs);
                    }
                }
            });
        });
    };

    /**
    * Given a results byte buffer, a random feeding nodes block of this node is prepended to the results, wrapped
    * within a QUERY_RESPONSE message. If no production-ready circuits are available, `null` is returned.
    *
    * @param {string} queryIdentifier The identifier of the query to use as transferId for the QUERY_RESPONSE message.
    * @param {Buffer} results The results batch as byte buffer.
    * @returns {Buffer} The resulting message which can be piped through circuits
    */
    ResponseManager.prototype._wrapQueryResponse = function (queryIdentifier, results) {
        if (this._circuitManager.getReadyCircuits().length) {
            return this._transferMessageCenter.wrapTransferMessage('QUERY_RESPONSE', queryIdentifier, this._writableQueryResponseFactory.constructMessage(this._circuitManager.getRandomFeedingNodesBatch(), results));
        }

        return null;
    };
    return ResponseManager;
})();

module.exports = ResponseManager;
//# sourceMappingURL=ResponseManager.js.map
