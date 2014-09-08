/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The interface for all kinds of protocol messages that must be constructed. Has a single method, `constructMessage`,
 * which returns the resulting Buffer.
 *
 * @interface
 * @class core.protocol.messages.WritableMessageFactoryInterface
 */
interface WritableMessageFactoryInterface {

	/**
	 * Constructs a message from a payload in whatever fashion
	 * Providing the byte length of the payload is optional, however if the length is know anyway,
	 * this can lead to a performance gain as the bytes don't need to be counted.
	 *
	 * @param {Buffer} payload The payload of the message
	 * @param {number) payloadLength Optional number of bytes of the payload (performance gain)
	 * @returns {Buffer} The resulting message
	 */
	constructMessage (payload:Buffer, payloadLength?:number):Buffer;

}

export = WritableMessageFactoryInterface;