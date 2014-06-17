/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');
import HydraNode = require('./HydraNode');

/**
 * The HydraConnectionManager's aim is to map sockets to IPs, thus eliminating the need to juggle around with identifiers
 * of the ProtocolConnectionManager.
 * It constructs basic hydra messages from incoming messages and emits them further in a `hydraMessage` event.
 * Furthermore one can (un)register 'circuit nodes'. The sockets to circuit nodes are automatically kept alive, and if a
 * connection terminates to the IP address, the connection manager automatically tries to reconnect to it (or if it has no
 * knowledge of a reachable port, waits for a connection). If this fails, a `globalConnectionFail` is emitted with the
 * IP address as parameter. Other classes can listen on this event and act accordingly (e.g. hydra circuit teardown etc.)
 *
 * Even further, the connection manager should be used to pipe messages to nodes - if a connection is currently not established,
 * the manager waits for a specific time and keeps the message in its pipeline, until it is sent off.
 *
 * @interface
 * @class core.protocol.hydra.HydraConnectionManagerInterface
 * @extends NodeJS.EventEmitter
 */
interface HydraConnectionManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Adds a node to the 'circuit nodes', the type of nodes whose sockets are kept alive and
	 * who require a reconnect on connection loss.
	 *
	 * @method core.protocol.hydra.HydraConnectionManagerInterface#addToCircuitNodes
	 *
	 * @param {core.protocol.hydra.HydraNode} node
	 */
	addToCircuitNodes (node:HydraNode):void;

	/**
	 * Removes a node from the circuit nodes. Existing sockets connected to this IP address are no longer
	 * kept open (timeout kill themselves).
	 *
	 * @method core.protocol.hydra.HydraConnectionManagerInterface#removeFromCircuitNodes
	 *
	 * @param {core.protocol.hydra.HydraNode} node
	 */
	removeFromCircuitNodes (node:HydraNode):void;

	/**
	 * Creates a general writable hydra message from a message payload and puts it into the pipeline
	 *
	 * @param {string} messageType Human readable representation of the message type.
	 * @param {Buffer} payload The payload of the message
	 * @param {core.protocol.hydra.HydraNode} to Node to send the message to
	 * @param {string} circuitId Optional circuit ID to prepend to the message.
	 */
	pipeMessage (messageType:string, payload:Buffer, to:HydraNode, circuitId?:string):void;

}

export = HydraConnectionManagerInterface;