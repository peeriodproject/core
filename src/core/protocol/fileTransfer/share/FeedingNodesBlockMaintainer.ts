import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import HydraCircuitList = require('../../hydra/interfaces/HydraCircuitList');
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