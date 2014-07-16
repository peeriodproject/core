import events = require('events');

import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import HydraCircuitList = require('../../hydra/interfaces/HydraCircuitList');
import HydraCircuitInterface = require('../../hydra/interfaces/HydraCircuitInterface');
import HydraNode = require('../../hydra/interfaces/HydraNode');

/**
 * FeedingNodesBlockMaintainerInterface implementation
 *
 * @class core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer
 * @interface core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface
 *
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager.
 */
class FeedingNodesBlockMaintainer extends events.EventEmitter implements FeedingNodesBlockMaintainerInterface {

	/**
	 * Stores the feeding nodes byte buffer block constructed from the currently maintained node batch.
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_block
	 */
	private _block:Buffer = null;

	/**
	 * Stores the working hydra circuit manager provided in the constructor.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Stores the listener on the hydra circuit manager's 'circuitCount' event, indicating changes in the circuit infrastructure.
	 *
	 * @member {Function} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_countListener
	 */
	private _countListener:Function = null;

	/**
	 * Stores the currently maintained node batch.
	 *
	 * @member {core.protocol.hydra.HydraNodeList} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_nodeBatch
	 */
	private _nodeBatch:HydraNodeList = null;

	public constructor (circuitManager:CircuitManagerInterface) {
		super();

		this._circuitManager = circuitManager;

		this._nodeBatch = this._circuitManager.getRandomFeedingNodesBatch() || [];
		this._block = FeedingNodesMessageBlock.constructBlock(this._nodeBatch);

		this._countListener = () => {
			this._checkCircuitsAndUpdateBlock();
		};

		this._circuitManager.on('circuitCount', this._countListener);
	}

	public cleanup ():void {
		this._circuitManager.removeListener('circuitCount', this._countListener);
		this.removeAllListeners('nodeBatchLength');
	}

	public getBlock ():Buffer {
		return this._block;
	}

	public getCurrentNodeBatch ():HydraNodeList {
		return this._nodeBatch;
	}

	/**
	 * The listener on the circuit manaager's 'circuitCount' event, indicating changes in the circuits.
	 * It checks every node in the current batch if the assigned circuit is still open. If yes, the node
	 * is kept, if no, it is removed from the batch. If any new circuits come in, a random node from
	 * them is added to the maintained batch.
	 *
	 * @method core.protocol.fileTransfer.share.FeedingNodesBlockMaintainer~_checkCircuitsAndUpdateBlock
	 */
	private _checkCircuitsAndUpdateBlock():void {
		var existingCircuits:HydraCircuitList = this._circuitManager.getReadyCircuits();

		var newBatch:HydraNodeList = [];

		for (var i=0, l=existingCircuits.length; i<l; i++) {
			var circuitNodes:HydraNodeList = existingCircuits[i].getCircuitNodes();
			var found:boolean = false;

			for (var j=0, k=this._nodeBatch.length; j<k; j++) {
				var node:HydraNode = this._nodeBatch[j];

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

		var nodeBatchLength:number = this._nodeBatch.length;

		if (nodeBatchLength) {
			this.emit('nodeBatchLength', nodeBatchLength)
		}
	}

}

export = FeedingNodesBlockMaintainer;