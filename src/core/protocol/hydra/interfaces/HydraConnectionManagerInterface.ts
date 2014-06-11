import events = require('events');
import HydraNode = require('./HydraNode');

interface HydraConnectionManagerInterface extends NodeJS.EventEmitter {

	addToCircuitNodes (node:HydraNode):void;

	removeFromCircuitNodes (node:HydraNode):void;

	pipeMessage (payload:Buffer, to:HydraNode):void;

}

export = HydraConnectionManagerInterface;