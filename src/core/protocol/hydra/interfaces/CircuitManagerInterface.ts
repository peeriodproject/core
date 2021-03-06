/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraCircuitList = require('./HydraCircuitList');
import HydraNodeList = require('./HydraNodeList');

/**
 * The CircuitManager keeps track of the Hydra circuits, constructs them and always tries to maintain an optimal desired
 * number of fully constructed, production ready circuits.
 * When it has reached the desired number of constructed circuits, it kicks off a 'desiredCircuitAmountReached' event.
 *
 * @interface
 * @class core.protocol.hydra.CircuitManagerInterface
 */
interface CircuitManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Returns the optimal desired number of circuits the node should maintain.
	 * Gets read from config.
	 *
	 * @method core.protocol.hydra.CircuitManagerInterface
	 *
	 * @returns {number}
	 */
	getDesiredNumberOfCircuits ():number;

	/**
	 * Returns a hydra node list consisting of a random node from each production-ready circuit.
	 *
	 * @method core.protocol.hydra.CircuitManagerInterface#getRandomFeedingNodesBatch
	 *
	 * @returns {core.protocol.hydra.HydraNodeList}
	 */
	getRandomFeedingNodesBatch ():HydraNodeList;

	/**
	 * Returns all production-ready, built up circuits.
	 *
	 * @method core.protocol.hydra.CircuitManagerInterface#getReadyCircuits
	 *
	 * @returns {core.protocol.hydra.HydraCircuitList}
	 */
	getReadyCircuits ():HydraCircuitList;

	/**
	 * Starts the construction and watching of hydra circuits.
	 *
	 * @method core.protocol.hydra.CircuitManagerInterface#kickOff
	 */
	kickOff ():void;

	/**
	 * Sends a FILE_TRANSFER message with the given payload through the circuit with the provided circuitId (if present and constructed).
	 *
	 * @method core.protocol.hydra.CircuitManager#pipeFileTransferMessageThroughCircuit
	 *
	 * @param {string} circuitId
	 * @param {Buffer} payload
	 * @returns {boolean} `true` If the circuit existed, `false` if it did not exist.
	 */
	pipeFileTransferMessageThroughCircuit (circuitId:string, payload:Buffer):boolean;

	/**
	 * Sends a FILE_TRANSFER message with the given payload through all current constructed and production-ready circuits.
	 *
	 * @method core.protocol.hydra.CircuitManager#pipeFileTransferMessageThroughAllCircuits
	 *
	 * @param {Buffer} payload
	 * @param {boolean} randomExitNode Default to false. If this is true, from each circuit a random exit node for the message is chosen.
	 * @returns {boolean} `true` if there were circuits, `false` if there are no circuits.
	 */
	pipeFileTransferMessageThroughAllCircuits (payload:Buffer, randomExitNode?:boolean):boolean;

	/**
	 * Sends a FILE_TRANSFER message with the given payload through a random constructed and production-ready circuits.
	 *
	 * @method core.protocol.hydra.CircuitManager#pipeFileTransferMessageThroughRandomCircuit
	 *
	 * @param {Buffer} payload
	 * @returns {boolean} `true` if it there were circuits, `false` if there are no circuits.
	 */
	pipeFileTransferMessageThroughRandomCircuit (payload:Buffer):boolean;

	/**
	 * Tears down a circuit with the provided circuitId, if constructed and present.
	 *
	 * @method core.protocol.hydra.CircuitManager#teardownCircuit
	 *
	 * @param {string} circuitId The ID of the circuit to tear down.
	 */
	teardownCircuit (circuitId:string):void;
}

export = CircuitManagerInterface;