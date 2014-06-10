/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The interface for generally all hydra messages. Simply prepends the message indicator byte to the payload.
 *
 * @interface
 * @class core.protocol.hydra.WritableHydraMessageFactoryInterface
 */
interface WritableHydraMessageFactoryInterface {

	/**
	 * Constructs a hydra message from a payload in whatever fashion.
	 * Merely prepends the message indicator byte taken by its human readable representation.
	 *
	 * @method core.protocol.hydra.WritableHydraMessageFactoryInterface#constructMessage
	 *
	 * @param {string} msgType Human readable representation of the message type.
	 * @param {Buffer} payload The payload of the message
	 * @param {number} payloadLength Optional number of octets of the payload.
	 */
	constructMessage (msgType:string, payload:Buffer, payloadLength?:number):Buffer;

}

export = WritableHydraMessageFactoryInterface;