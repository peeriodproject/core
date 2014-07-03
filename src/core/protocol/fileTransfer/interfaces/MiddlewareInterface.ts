/// <reference path='../../../../../ts-definitions/node/node.d.ts' />/**

import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');

/**
 * The Middleware represents the connecting of two hydra circuits, i.e. an initializer pipes a message through one of
 * his circuits with the intention that the receiving node feeds the message payload to the exit node of another circuits, who
 * himself pipes down the message through the appropriate circuit to the receiver.
 *
 * As most of the messaging is handled by the TransferMessageCenter, the middleware layer mainly manages the socket connections
 * to other - external - circuit nodes.
 *
 * It does so by keeping a list of socket identifiers, each of which is assigned to a concatenation of the circuitId the request
 * to feed came through, the ip, the port, and the feedingIdentifier to use. Generally, sockets used for feeding other circuits
 * are not kept open, as it is hard to truly determine whether a socket is being used, no longer used etc.
 * However, if a socket is still open and another request to feed rolls in with a number of possible nodes, the list of nodes
 * is checked for a node to which a socket (where the concatenations of the above mentioned parameters match) is open.
 * If there is one, it is used. If there is none, a random node from the list is taken and connected to until a valid connection
 * could be opened or all nodes have been probed.
 *
 * Feeding sockets are used in a one-direction manner, that is that data is only sent if an outgoing connection has been established
 * to one of the nodes. Incoming sockets are stored as well, but only to assign them to the circuit the message need be piped back through,
 * so that the socket can be closed as soon as the underlying circuit is terminated. This is only for cleanup and receiving data, no
 * outgoing data is sent through an incoming socket.
 *
 * @interface
 * @class core.protocol.fileTransfer.MiddlewareInterface
 */
interface MiddlewareInterface {

	/**
	 * Adds an incoming socket by its identifier to the incoming socket list, by assigning the circuitId (of the circuit
	 * the message needed to be piped back through) to socket identifier of the socket through which the node got fed.
	 *
	 * @method core.protocol.fileTransfer.MiddlewareInterface#addIncomingSocket
	 *
	 * @param {string} circuitId The identifier of the circuit the fed message needed to be piped back through
	 * @param {string} socketIdentifier The identifier of the socket through which the node got fed.
	 */
	addIncomingSocket (circuitId:string, socketIdentifier:string):void;

	closeSocketByIdentifier (socketIdentifier:string):void;

	feedNode (feedingNodes:HydraNodeList, associatedCircuitId:string, payloadToFeed:Buffer):void;
}

export = MiddlewareInterface;