import FeedingNodesBlockMaintainerFactoryInterface = require('./interfaces/FeedingNodesBlockMaintainerFactoryInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');

/**
 * @class core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactory
 * @implements core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface
 *
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
 */
class FeedingNodesBlockMaintainerFactory implements FeedingNodesBlockMaintainerFactoryInterface {

	/**
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactory~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	public constructor (circuitManager:CircuitManagerInterface) {
		this._circuitManager = circuitManager;
	}

	public create ():FeedingNodesBlockMaintainerInterface {
		return new FeedingNodesBlockMaintainer(this._circuitManager);
	}

}

export = FeedingNodesBlockMaintainerFactory;