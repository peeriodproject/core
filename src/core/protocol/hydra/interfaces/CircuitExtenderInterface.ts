/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('./HydraNodeList');
import HydraNode = require('./HydraNode');

/**
 * CircuitExtender is the class that is used to extend the Hydra Circuits, no matter if it is the first node
 * or any of the subsequent relay nodes.
 *
 * @interface
 * @class core.protocol.hydra.CircuitExtenderInterface
 */
interface CircuitExtenderInterface {

	/**
	 * Extends the circuit node.
	 * It sends ADDITIVE_SHARING messages to the additive nodes and either relays the last message through the
	 * already established relay hops or directly sends the last CREATE_CELL_ADDITIVE message to the node to extend with.
	 * (if it is the first node).
	 *
	 * It errors out, if the whole request times out or something strange happens (UUID do not match, SHA1-hashes of the
	 * shared secrets do not match). In this case, the circuit should be torn down and not be used again.
	 * If the request is rejected, there is no error, but the rejection flag is true. In this case, the node to extend with
	 * should be substituted and the circuit can still be used.
	 *
	 * The new node MUST NOT be added to the layered encryption decryption handler. This is already done by the
	 * CircuitExtender.
	 *
	 * Only ONE CircuitExtender should be assigned to one hydra circuit.
	 *
	 * @method core.protocol.hydra.CircuitExtenderInterface#extend
	 *
	 * @param {core.protocol.hydra.HydraNode} nodeToExtendWith The node to extend the circuit with. Must have ip and port sepcified.
	 * @param {core.protocol.hydra.HydraNodeList} additiveNodes The array of nodes to use for the additive sharing scheme (does not include potential last relay nodes)
	 * @param {Function} callback Function that gets called when the request was accepted, rejected, timed out or an error occured. `newNode` is the nodeToExtendWith which
	 * received keys and was added to the layered encryption/decryption handler
	 */
	extend (nodeToExtendWith:HydraNode, additiveNodes:HydraNodeList, callback:(err:Error, isRejection:boolean, newNode:HydraNode) => any):void;
}

export = CircuitExtenderInterface;

