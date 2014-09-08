/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import FeedingNodesBlockMaintainerInterface = require('./FeedingNodesBlockMaintainerInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface
 */
interface FeedingNodesBlockMaintainerFactoryInterface {

	/**
	 * Creates a FeedingNodesBlockMaintainer for upload/downlaod.
	 *
	 * @method core.protocol.fielTransfer.share.FeedingNodesBlockMaintainerFactoryInterface#create
	 *
	 * @returns {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface}
	 */
	create ():FeedingNodesBlockMaintainerInterface;
}

export = FeedingNodesBlockMaintainerFactoryInterface;