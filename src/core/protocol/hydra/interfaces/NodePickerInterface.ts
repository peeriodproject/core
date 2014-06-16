/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('./HydraNodeList');

interface NodePickerInterface {

	pickRelayNodeBatch (callback: (batch:HydraNodeList) => any):void;

	pickNextAdditiveNodeBatch (callback: (batch:HydraNodeList) => any):void;

}

export = NodePickerInterface;