/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * This class represents the payload of a CREATE_CELL_ADDITIVE message.
 * Multiple messages combined result in the cleartext of the additive sharing scheme which is used for
 * extending hydra circuits.
 * Such a message consists of the following:
 *
 * - 1 byte indicating if this message was received from the 'initiator', which means if the message contains a circuitID
 * and if the node who sent the message is the node who awaits the response in the end.
 * - 16 bytes for the circuitID, if the message is from the initiator
 * - 16 bytes for a UUID of the additive message batch. This is for keeping track of additive sharing schemes.
 * - 256 bytes for the 'real' payload of the additive sharing message. All payloads combined result in the cleartext,
 * which is the half of the Diffie Hellman handshake.
 *
 * @class
 * @interface core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface
 */
interface ReadableCreateCellAdditiveMessageInterface {

	/**
	 * Indicates whether this message was received from the 'initiator', i.e. the initiator awaits the response.
	 *
	 * @method core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface#isInitiator
	 *
	 * @returns {boolean}
	 */
	isInitiator ():boolean;

	/**
	 * Returns the circuitID. This is only present if the message was received from the initiator.
	 *
	 * @method core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface#getCircuitId
	 *
	 * @returns {string}
	 */
	getCircuitId ():string;

	/**
	 * Gets the universally unique identifier used for keeping track of additive sharing message batches.
	 *
	 * @method core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface#getUUID
	 *
	 * @returns {string}
	 */
	getUUID ():string;

	/**
	 * Returns the actual additive payload. Multiple additive payloads result in the cleartext of the scheme.
	 *
	 * @method core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface#getAdditivePayload
	 *
	 * @returns {Buffer}
	 */
	getAdditivePayload ():Buffer;
}

export = ReadableCreateCellAdditiveMessageInterface;