/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The ReadableCellCreatedRejectedMessage represents CELL_REJECTED and CELL_CREATED message, i.e. answers to additive
 * CREATE_CELL requests.
 * This is a circuit-message, which means that the circuit ID is always appended (but stripped off by {@link core.protocol.hydra.ReadableHydraMessageInterface}).
 *
 * If the message is a reject-message, the payload is constituted simply by:
 * - 16 bytes for UUID
 *
 * If the message confirms the cell creation, the payload is:
 * - 16 bytes for UUID
 * - 20 bytes for the SHA-1 Hahs of the shared secret
 * - 256 bytes for the other half of the Diffie-Hellman key exchange
 *
 * @interface
 * @class core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface
 */
interface ReadableCellCreatedRejectedMessageInterface {

	/**
	 * Returns the 256 bytes of the other half of the Diffie-Hellman key exchange.
	 * This is only present if the message is not rejected.
	 *
	 * @method core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface#getDHPayload
	 *
	 * @returns {Buffer}
	 */
	getDHPayload ():Buffer;

	/**
	 * Returns the 20 bytes of the SHA-1 hash of the shared secret.
	 * This is only present if the message is not rejected.
	 *
	 * @method core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface#getSecretHash
	 *
	 * @returns {Buffer}
	 */
	getSecretHash ():Buffer;

	/**
	 * Returns the universally unique identifier of the additive sharing scheme.
	 *
	 * @method core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface#getUUID
	 *
	 * @returns {string}
	 */
	getUUID ():string;

	/**
	 * Indicates if the message is a rejected message.
	 *
	 * @method core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface#isRejected
	 *
	 * @returns {boolean}
	 */
	isRejected ():boolean;
}

export = ReadableCellCreatedRejectedMessageInterface;