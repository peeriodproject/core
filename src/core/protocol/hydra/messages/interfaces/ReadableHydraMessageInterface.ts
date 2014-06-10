/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The ReadableHydraMessage constitutes the wrapper for all hydra – and thus anonymous - messages.
 * It begins with one byte indicating the message type and is directly followed by the payload.
 *
 * @interface
 * @class core.protocol.hydra.ReadableHydraMessageInterface
 */
interface ReadableHydraMessageInterface {

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