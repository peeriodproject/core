/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('./HydraNodeList');
import HydraNode = require('./HydraNode');

/**
 * The NodePicker interface is a class that should be passed to a hydra circuit. It is used for choosing
 * Relay/Exit Nodes of a circuit and for choosing nodes for the additive sharing scheme.
 *
 * This is done by choosing random IP:Port pairs from the routing table. When calling one of its
 * picking functions, a batch of nodes is always returned. Thus, when there are not enough nodes in the
 * routing table to generate some sort of randomness, a waiting timeout is set to give the routing table
 * ample time to obtain knowledge of other nodes.
 *
 * The NodePicker follows some rules:
 * 1.) Relay nodes cannot be part of an additive sharing batch.
 * 2.) Each additive sharing batch has a threshold k of known nodes, which means that a maximum of k nodes
 * who participated in previous sharing rounds can be chosen again.
 * 3.) Each unsuccessful try of getting a random node increments a counter. Once that counter reaches a
 * certain threshold, the waiting timeout is set.
 *
 * @interface
 * @class core.protocol.hydra.NodePickerInterface
 */
interface NodePickerInterface {

	/**
	 * Picks an additional relay node. This can be called after `pickRelayNodeBatch`. This is useful when
	 * trying to substitute a node which has rejected a CREATE_CELL request.
	 *
	 * @method core.protocol.hydra.NodePickerInterface#pickAdditionalRelayNode
	 *
	 * @param {Function} callback A function which gets called with the resulting node as argument.
	 */
	pickAdditionalRelayNode (callback: (node:HydraNode) => any):void;

	/**
	 * Picks a batch of nodes which can be used as nodes for one round of an additive sharing scheme.
	 * Each call to this function affects subsequent calls to it (see rules above).
	 * This method can only be called after `pickRelayNodeBatch` has been called.
	 *
	 * @method core.protocol.hydra.NodePickerInterface#pickNextAdditiveNodeBatch
	 *
	 * @param {Function} callback A function which gets called with the resulting batch of HydraNodes as argument.
	 */
	pickNextAdditiveNodeBatch (callback: (batch:HydraNodeList) => any):void;

	/**
	 * Picks a batch of nodes which can be used as relay nodes within a circuit.
	 * This function must be called before `pickNextAdditiveNodeBatch` and can only be called once per
	 * instance.
	 *
	 * @method core.protocol.hydra.NodePickerInterface#pickRelayNodeBatch
	 *
	 * @param {Function} callback A function which gets called with the resulting batch of HydraNodes as argument.
	 */
	pickRelayNodeBatch (callback: (batch:HydraNodeList) => any):void;

}

export = NodePickerInterface;