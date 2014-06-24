/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

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
	 */
	pipeFileTransferMessageThroughCircuit (circuitId:string, payload:Buffer):void;

	/**
	 * Sends a FILE_TRANSFER message with the given payload through all current constructed and production-ready circuits.
	 *
	 * @method core.protocol.hydra.CircuitManager#pipeFileTransferMessageThroughAllCircuits
	 *
	 * @param {Buffer} payload
	 */
	pipeFileTransferMessageThroughAllCircuits (payload:Buffer):void;
}

export = CircuitManagerInterface;