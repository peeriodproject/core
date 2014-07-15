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

        var newBatch = [];

        for (var i = 0, l = existingCircuits.length; i < l; i++) {
            var circuitNodes = existingCircuits[i].getCircuitNodes();
            var found = false;

            for (var j = 0, k = this._nodeBatch.length; j < k; j++) {
                var node = this._nodeBatch[j];

                if (circuitNodes.indexOf(node) > -1) {
                    found = true;

                    // circuit still exists, keep node
                    newBatch.push(node);
                }
            }

            if (!found) {
                // circuit seems to be new
                newBatch.push(circuitNodes[Math.floor(Math.random() * circuitNodes.length)]);
            }
        }

        this._nodeBatch = newBatch;
        this._block = FeedingNodesMessageBlock.constructBlock(this._nodeBatch);
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
