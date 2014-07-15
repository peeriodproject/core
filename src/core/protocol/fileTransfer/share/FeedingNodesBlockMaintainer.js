var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

var FeedingNodesBlockMaintainer = (function () {
    function FeedingNodesBlockMaintainer(circuitManager) {
        var _this = this;
        this._block = null;
        this._circuitManager = null;
        this._nodeBatch = null;
        this._countListener = null;
        this._circuitManager = circuitManager;

        this._nodeBatch = this._circuitManager.getRandomFeedingNodesBatch() || [];
        this._block = FeedingNodesMessageBlock.constructBlock(this._nodeBatch);

        this._countListener = function () {
            _this._checkCircuitsAndUpdateBlock();
        };

        this._circuitManager.on('circuitCount', this._countListener);
    }
    FeedingNodesBlockMaintainer.prototype._checkCircuitsAndUpdateBlock = function () {
        var existingCircuits = this._circuitManager.getReadyCircuits();
    };

    FeedingNodesBlockMaintainer.prototype.getCurrentNodeBatch = function () {
        return this._nodeBatch;
    };

    FeedingNodesBlockMaintainer.prototype.cleanup = function () {
        this._circuitManager.removeListener('circuitCount', this._countListener);
    };

    FeedingNodesBlockMaintainer.prototype.getBlock = function () {
        return this._block;
    };
    return FeedingNodesBlockMaintainer;
})();

module.exports = FeedingNodesBlockMaintainer;
//# sourceMappingURL=FeedingNodesBlockMaintainer.js.map
