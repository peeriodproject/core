var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');

/**
* FeedingNodesBlockMaintainerInterface implementation
*
* @class core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer
* @interface core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface
*
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager.
*/
var FeedingNodesBlockMaintainer = (function (_super) {
    __extends(FeedingNodesBlockMaintainer, _super);
    function FeedingNodesBlockMaintainer(circuitManager) {
        var _this = this;
        _super.call(this);
        /**
        * Stores the feeding nodes byte buffer block constructed from the currently maintained node batch.
        *
        * @member {Buffer} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_block
        */
        this._block = null;
        /**
        * Stores the working hydra circuit manager provided in the constructor.
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Stores the listener on the hydra circuit manager's 'circuitCount' event, indicating changes in the circuit infrastructure.
        *
        * @member {Function} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_countListener
        */
        this._countListener = null;
        /**
        * Stores the currently maintained node batch.
        *
        * @member {core.protocol.hydra.HydraNodeList} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_nodeBatch
        */
        this._nodeBatch = null;

        this._circuitManager = circuitManager;

        this._nodeBatch = this._circuitManager.getRandomFeedingNodesBatch() || [];
        this._block = FeedingNodesMessageBlock.constructBlock(this._nodeBatch);

        this._countListener = function () {
            _this._checkCircuitsAndUpdateBlock();
        };

        this._circuitManager.on('circuitCount', this._countListener);
    }
    FeedingNodesBlockMaintainer.prototype.cleanup = function () {
        this._circuitManager.removeListener('circuitCount', this._countListener);
        this.removeAllListeners('nodeBatchLength');
    };

    FeedingNodesBlockMaintainer.prototype.getBlock = function () {
        return this._block;
    };

    FeedingNodesBlockMaintainer.prototype.getCurrentNodeBatch = function () {
        return this._nodeBatch;
    };

    /**
    * The listener on the circuit manaager's 'circuitCount' event, indicating changes in the circuits.
    * It checks every node in the current batch if the assigned circuit is still open. If yes, the node
    * is kept, if no, it is removed from the batch. If any new circuits come in, a random node from
    * them is added to the maintained batch.
    *
    * @method core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_checkCircuitsAndUpdateBlock
    */
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

        var nodeBatchLength = this._nodeBatch.length;

        if (nodeBatchLength) {
            this.emit('nodeBatchLength', nodeBatchLength);
        }
    };
    return FeedingNodesBlockMaintainer;
})(events.EventEmitter);

module.exports = FeedingNodesBlockMaintainer;
//# sourceMappingURL=FeedingNodesBlockMaintainer.js.map
