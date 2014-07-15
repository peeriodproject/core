/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('../../../hydra/interfaces/HydraNodeList');

/**
 * The FeedingNodesBlockMaintainer
 *
 */
interface FeedingNodesBlockMaintainerInterface {

	getCurrentNodeBatch ():HydraNodeList;

	getBlock ():Buffer;

	cleanup ():void;
}

export = FeedingNodesBlockMaintainerInterface;