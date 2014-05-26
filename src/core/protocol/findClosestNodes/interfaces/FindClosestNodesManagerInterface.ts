/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import IdInterface = require('../../../topology/interfaces/IdInterface');

interface FindClosestNodesManagerInterface extends NodeJS.EventEmitter {

	startCycleFor (id:IdInterface):void;

	getK ():number;
	getAlpha ():number;
	getCycleExpirationMillis ():number;
	getParallelismDelayMillis ():number;

}

export = FindClosestNodesManagerInterface;