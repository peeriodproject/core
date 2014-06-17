/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('./HydraNodeList');
import HydraNode = require('./HydraNode');

interface CircuitExtenderInterface {

	extend (nodeToExtendWith:HydraNode, additiveNodes:HydraNodeList, callback: (err:Error, isRejection:boolean, newNode:HydraNode) => any):void;
}

export = CircuitExtenderInterface;

