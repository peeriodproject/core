var FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');

/**
* @class core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactory
* @implements core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface
*
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
*/
var FeedingNodesBlockMaintainerFactory = (function () {
    function FeedingNodesBlockMaintainerFactory(circuitManager) {
        /**
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactory~_circuitManager
        */
        this._circuitManager = null;
        this._circuitManager = circuitManager;
    }
    FeedingNodesBlockMaintainerFactory.prototype.create = function () {
        return new FeedingNodesBlockMaintainer(this._circuitManager);
    };
    return FeedingNodesBlockMaintainerFactory;
})();

module.exports = FeedingNodesBlockMaintainerFactory;
//# sourceMappingURL=FeedingNodesBlockMaintainerFactory.js.map
