/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a CELL_CREATED_REJECTED message.
 * Note: This is a circuit message, so the circuit ID must always be appended,
 * see {@link core.protocol.hydra.WritableHydraMessageFactoryInterface}
 *
 * @interface
 * @class core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface
 */
interface WritableCellCreatedRejectedMessageFactoryInterface {

	/**
	 * Constructs the payload for a CELL_CREATED_REJECTED message.
	 *
	 * @method core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface#constructMessage
	 *
	 * @param {string} uuid The universally unique identifier (16 bytes)
	 * @param {Buffer} secretHash Optional. If the message is a rejected message, this must not be provided. 20 bytes.
	 * @param {Buffer} dhPayload The other half of the Diffie-Hellman key exchange. 2048 bytes.
	 *
	 * @returns {Buffer}
	 */
	constructMessage (uuid:string, secretHash?:Buffer, dhPayload?:Buffer):Buffer;

}

export = WritableCellCreatedRejectedMessageFactoryInterface;