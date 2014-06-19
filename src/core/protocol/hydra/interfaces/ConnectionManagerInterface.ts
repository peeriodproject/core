/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('./HydraNode');

/**
 * Handles socket connections regarding hydra messages.
 * Tries to assign specific sockets to nodes, so that circuits can be rendered unusable when
 * their socket related to the circuit are terminated.
 *
 * @interface
 * @class core.protocol.hydra.ConnectionManagerInterface
 */
interface ConnectionManagerInterface extends NodeJS.EventEmitter {

	pipeCircuitMessageTo (node:HydraNode, messageType:string, payload:Buffer, skipCircIdOnConstruction?:boolean):void;

	pipeMessageTo (node:HydraNode, messageType:string, payload:Buffer):void;

	addToCircuitNodes (socketIdentifier:string, node:HydraNode):void;

	removeFromCircuitNodes (node:HydraNode):HydraNode;
}

export = ConnectionManagerInterface;