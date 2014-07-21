/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import FeedingNodesBlockMaintainerInterface = require('./FeedingNodesBlockMaintainerInterface');

interface FeedingNodesBlockMaintainerFactoryInterface {

	create ():FeedingNodesBlockMaintainerInterface;
}

export = FeedingNodesBlockMaintainerFactoryInterface;