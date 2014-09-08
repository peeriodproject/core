/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * Represents the participation in a hydra circuit, i.e. being a relay node.
 *
 * @interface
 * @class core.protocol.hydra.HydraCellInterface
 */
interface HydraCellInterface extends NodeJS.EventEmitter {

	/**
	 * Returns the feeding identifier shared with the initiator node of the circuit.
	 *
	 * @member core.protocol.hydra.HydraCellInterface#getFeedingIdentifier
	 *
	 * @returns {string}
	 */
	getFeedingIdentifier ():string;

	/**
	 * Returns the circuit ID shared with the predecessor node.
	 *
	 * @member core.protocol.hydra.HydraCellInterface#getPredecessorCircuitId
	 *
	 * @returns {string} The circuit ID shared with the predecessor node.
	 */
	getPredecessorCircuitId ():string;

	/**
	 * Sends a FILE_TRANSFER message back through the circuit.
	 *
	 * @method core.protocol.hydra.HydraCellInterface#sendFileMessage
	 *
	 * @param {Buffer} payload The payload of the FILE_TRANSFER message
	 */
	sendFileMessage (payload:Buffer):void;

	/**
	 * Forcefully tears down the cell by closing the connection to predecessor and successor.
	 *
	 * @method core.protocol.hydra.HydraCellInterface#teardown
	 */
	teardown ():void;
}

export = HydraCellInterface;