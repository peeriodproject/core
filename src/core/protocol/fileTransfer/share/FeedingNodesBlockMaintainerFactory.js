var FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');

var FeedingNodesBlockMaintainerFactory = (function () {
    function FeedingNodesBlockMaintainerFactory(circuitManager) {
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
