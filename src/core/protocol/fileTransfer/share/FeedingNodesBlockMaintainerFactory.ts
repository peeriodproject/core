import FeedingNodesBlockMaintainerFactoryInterface = require('./interfaces/FeedingNodesBlockMaintainerFactoryInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');

class FeedingNodesBlockMaintainerFactory implements FeedingNodesBlockMaintainerFactoryInterface {

	private _circuitManager:CircuitManagerInterface = null;

	public constructor (circuitManager:CircuitManagerInterface) {
		this._circuitManager = circuitManager;
	}

	public create ():FeedingNodesBlockMaintainerInterface {
		return new FeedingNodesBlockMaintainer(this._circuitManager);
	}

}

export = FeedingNodesBlockMaintainerFactory;