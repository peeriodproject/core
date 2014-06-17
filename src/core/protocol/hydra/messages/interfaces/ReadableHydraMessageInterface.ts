/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The ReadableHydraMessage constitutes the wrapper for all hydra – and thus anonymous - messages.
 * It begins with one byte indicating the message type and is directly followed by the payload.
 * If the message is a 'Circuit-type' message, the circuit ID is also extracted.
 *
 * @interface
 * @class core.protocol.hydra.ReadableHydraMessageInterface
 */
interface ReadableHydraMessageInterface {

	/**
	 * Returns the circuit ID this message is referring to. This is only present if the message is a 'circuit-type'
	 * message (e.g. ENCRYPTED_SPITOUT, ENCRYPTED_DIGEST, CELL_CREATED, TEARDOWN)
	 *
	 * @method core.protocol.hydra.ReadableHydraMessageInterface#getCircuitId
	 *
	 * @returns {string} The circuit ID or `null` if not present
	 */
	getCircuitId ():string;

	/**
	 * Returns the human-readable message type according to the Message byte cheatsheet
	 *
	 * @method core.protocol.hydra.ReadableHydraMessageInterface#getMessageType
	 *
	 * @returns {string} The message type
	 */
	getMessageType ():string;

	/**
	 * Returns the payload as Buffer.
	 *
	 * @method core.protocol.hydra.ReadableHydraMessageInterface#getPayload
	 *
	 * @returns {Buffer} The payload
	 */
	getPayload ():Buffer;

}

export = ReadableHydraMessageInterface;