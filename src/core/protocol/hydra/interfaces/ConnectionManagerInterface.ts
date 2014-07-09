/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('./HydraNode');

/**
 * The interface between anonymous messaging and the protocol connection manager.
 * Handles socket connections regarding hydra messages.
 * Tries to assign specific sockets to nodes, so that circuits can be rendered unusable when
 * their socket related to the circuit are terminated.
 *
 * It is crucial that the node objects always stay the same, as socket identifiers are assigned to them.
 *
 * @interface
 * @class core.protocol.hydra.ConnectionManagerInterface
 */
interface ConnectionManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Adds a node to the 'circuitNodes' by assigning the node the socket identifier.
	 * All piped circuit messages will go over this exact socket.
	 * Also keeps the socket open.
	 *
	 * Requires the node to already have a circuit id.
	 *
	 * @method core.protocol.hydra.ConnectionManagerInterface#addToCircuitNodes
	 *
	 * @param {string} socketIdentifier The identifier of the socket to assign to the node.
	 * @param {core.protocol.hydra.HydraNode} node The node to add to the circuit list.
	 */
	addToCircuitNodes (socketIdentifier:string, node:HydraNode):void;

	/**
	 * Pipes a message to the provided node.
	 * If the node already is assigned to a specific socket, this is used. If not, a new connection is obtained
	 * and the socket's identifier set on the node.
	 *
	 * Requires the node to already have a circuit id.
	 *
	 * @method core.protocol.hydra.ConnectionManagerInterface#pipeCircuitMessageTo
	 *
	 * @param {core.protocol.hydra.HydraNode} node The node to pipe the message to.
	 * @param {string} messageType Human readable representation of the message type.
	 * @param {Buffer} payload Payload to send.
	 * @param {boolean} skipCircIdOnConstruction If this is true, the circuit id is not prepended in the hydra message.
	 * This is used for e.g. CREATE_CELL_ADDITIVE messages, when the node already has a circut id, but the message is not
	 * yet a 'real' circuit message.
	 */
	pipeCircuitMessageTo (node:HydraNode, messageType:string, payload:Buffer, skipCircIdOnConstruction?:boolean):void;

	/**
	 * Pipes a message to a node. This will always open a new socket.
	 *
	 * @method core.protocol.hydra.ConnectionManagerInterface#pipeMessageTo
	 *
	 * @param {core.protocol.HydraNode} node The node to pipe the message to.
	 * @param {string} messageType Human readable representation of the message type.
	 * @param {Buffer) payload Payload to send.
	 */
	pipeMessageTo (node:HydraNode, messageType:string, payload:Buffer):void;

	/**
	 * Removes a node from the circuit list.
	 * No longer keeps open the assigned socket.
	 *
	 * @method core.protocol.hydra.ConnectionManagerInterface#removeFromCircuitNodes
	 *
	 * @param {core.protocol.hydra.HydraNode} node The node to remove.
	 * @param {boolean} closeSocket This is true by default and indicates if the underlying TCP socket should also be ended.
	 * @returns {core.protocol.hydra.HydraNode} node The removed node. `undefined` if the node was not present.
	 */
	removeFromCircuitNodes (node:HydraNode, closeSocket?:boolean):HydraNode;
}

export = ConnectionManagerInterface;