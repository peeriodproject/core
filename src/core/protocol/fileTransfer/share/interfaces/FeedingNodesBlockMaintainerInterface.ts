/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('../../../hydra/interfaces/HydraNodeList');

interface FeedingNodesBlockMaintainerInterface {

	getCurrentNodeBatch ():HydraNodeList;

	getBlock ():Buffer;

	cleanup ():void;
}

export = FeedingNodesBlockMaintainerInterface;