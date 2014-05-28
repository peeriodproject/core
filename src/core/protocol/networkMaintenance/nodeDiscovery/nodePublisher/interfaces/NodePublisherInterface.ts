/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import MyNodeInterface = require('../../../../../topology/interfaces/MyNodeInterface');

interface NodePublisherInterface {

	publish (myNode:MyNodeInterface):void;
}

export = NodePublisherInterface;
