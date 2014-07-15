import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import HydraCircuitList = require('../../hydra/interfaces/HydraCircuitList');
import HydraCircuitInterface = require('../../hydra/interfaces/HydraCircuitInterface');
import HydraNode = require('../../hydra/interfaces/HydraNode');

class FeedingNodesBlockMaintainer implements FeedingNodesBlockMaintainerInterface {

	private _block:Buffer = null;
	private _circuitManager:CircuitManagerInterface = null;
	private _nodeBatch:HydraNodeList = null;
	private _countListener:Function = null;

	public constructor (circuitManager:CircuitManagerInterface) {
		this._circuitManager = circuitManager;

		this._nodeBatch = this._circuitManager.getRandomFeedingNodesBatch() || [];
		this._block = FeedingNodesMessageBlock.constructBlock(this._nodeBatch);

		this._countListener = () => {
			this._checkCircuitsAndUpdateBlock();
		};

		this._circuitManager.on('circuitCount', this._countListener);
	}

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
	}

	public getCurrentNodeBatch ():HydraNodeList {
		return this._nodeBatch;
	}

	public cleanup ():void {
		this._circuitManager.removeListener('circuitCount', this._countListener);
	}

	public getBlock ():Buffer {
		return this._block;
	}

}

export = FeedingNodesBlockMaintainer;