var BroadcastBasedQuery = require('./BroadcastBasedQuery');

/**
* QueryFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.QueryFactory
* @implements core.protocol.fileTransfer.QueryFactoryInterface
*
* @param {core.config.ConfigInterface} transferConfig
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
* @oaram {core.protocoo.broadcast.BroadcastManagerInterface} broadcastManager
*/
var QueryFactory = (function () {
    function QueryFactory(transferConfig, transferMessageCenter, circuitManager, broadcastManager) {
        /**
        * @member {core.protocoo.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.QueryFactory~_broadcastManager
        */
        this._broadcastManager = null;
        /**
        * @member {number} core.protocol.fileTransfer.QueryFactory~_broadcastValidityInMs
        */
        this._broadcastValidityInMs = null;
        /**
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.QueryFactory~_circuitManager
        */
        this._circuitManager = null;
        /**
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.QueryFactory~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        this._transferMessageCenter = transferMessageCenter;
        this._circuitManager = circuitManager;
        this._broadcastManager = broadcastManager;
        this._broadcastValidityInMs = transferConfig.get('fileTransfer.query.broadcastValidityInSeconds') * 1000;
    }
    QueryFactory.prototype.constructBroadcastBasedQuery = function (searchObject) {
        return new BroadcastBasedQuery(searchObject, this._transferMessageCenter, this._circuitManager, this._broadcastManager, this._broadcastValidityInMs);
    };
    return QueryFactory;
})();

module.exports = QueryFactory;
//# sourceMappingURL=QueryFactory.js.map
