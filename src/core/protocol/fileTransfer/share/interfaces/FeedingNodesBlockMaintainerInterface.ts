/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('../../../hydra/interfaces/HydraNodeList');

/**
 * The FeedingNodesBlockMaintainer should be hooked to a download/upload and keeps track of any circuit changes
 * and generated the feeding nodes block accordingly. On construction it chooses a random batch from the circuit manager,
 * and listens to circuit changes. If anything changes, it checks every node in its batch if the assigned circuit is still
 * open. If yes, the node is kept, if no, it is removed from the batch. If any new circuits come in, a random node from them
 * is added to the batch.
 *
 * This class is to ensure that any working feeding connections can be reused as long as the underlying circuits are valid.
 *
 * @class
 * @interface core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface
 */
interface FeedingNodesBlockMaintainerInterface extends NodeJS.EventEmitter {

	/**
	 * Cleans up the listener on the circuit manager, so that the instance can be garbage collected.
	 *
	 * @method core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface#cleanup
	 */
	cleanup ():void;

	/**
	 * Returns the current feeding nodes block buffer constructed from the maintained node batch.
	 * This method should be called everytime when constructing an upload/download message.
	 *
	 * @method core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface#getBlock
	 *
	 * @returns {Buffer}
	 */
	getBlock ():Buffer;

	/**
	 * Returns the currently maintained node batch.
	 *
	 * @method core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface#getCurrectNodeBatch
	 *
	 * @returns {core.protocol.hydra.HydraNodeList}
	 */
	getCurrentNodeBatch ():HydraNodeList;

}

export = FeedingNodesBlockMaintainerInterface;