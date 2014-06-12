/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');
import HydraNode = require('./HydraNode');

interface HydraConnectionManagerInterface extends NodeJS.EventEmitter {

	addToCircuitNodes (node:HydraNode):void;

	removeFromCircuitNodes (node:HydraNode):void;

	pipeMessage (messageType:string, payload:Buffer, to:HydraNode):void;

}

export = HydraConnectionManagerInterface;