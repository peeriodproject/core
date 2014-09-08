/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a CREATE_CELL_ADDITIVE message.
 *
 * @interface
 * @class core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface
 */
interface WritableCreateCellAdditiveMessageFactoryInterface {

	/**
	 * Constructs the payload for a CREATE_CELL_ADDITIVE messsage.
	 *
	 * @method core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface#constructMessage
	 *
	 * @param {boolean} isInitiator Indicates if this message is an 'initiator' message, i.e. if a circuit ID must be added.
	 * @param {string} uuid The universally unique identifier for the additive sharing mesage batch.
	 * @param {Buffer} additivePayload The additive payload, i.e. the one half of the Diffie-Hellman handshake
	 * @param {string} circuitId The circuit ID for the additive sharing message.
	 * Optional, but required if the message is an initiator message.
	 *
	 * @returns {Buffer} The resulting payload.
	 */
	constructMessage (isInitiator:boolean, uuid:string, additivePayload:Buffer, circuitId?:string):Buffer;

}

export = WritableCreateCellAdditiveMessageFactoryInterface;