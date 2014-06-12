/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * An additive sharing message is a message whose payload must be passed through to the IP:Port - address as a
 * CREATE_CELL_ADDITIVE message. The message starts with the address the payload must be sent to.
 *
 * An ADDITIVE_SHARING message consists of the following:
 *
 * - 1 indicator byte for IPv4 or IPv6
 * - 4 Bytes for IPv4 Address or 16 bytes for IPv6
 * - 2 bytes for the port
 * - The payload (!!! no indicator byte present) of CREATE_CELL_ADDITIVE message
 *
 * @interface
 * @class core.protocol.hydra.ReadableAdditiveSharingMessageInterface
 */
interface ReadableAdditiveSharingMessageInterface {

	/**
	 * Returns the extracted IP to which the payload must be relayed to.
	 *
	 * @method core.protocol.hydra.ReadableAdditiveSharingMessageInterface#getIp
	 *
	 * @returns {string}
	 */
	getIp ():string;

	/**
	 * Returns the payload (as buffer) which must be relayed to the extracted address in a
	 * CREATE_CELL_ADDITIVE message.
	 *
	 * @method core.protocol.hydra.ReadableAdditiveSharingMessageInterface#getPayload
	 *
	 * @returns {Buffer}
	 */
	getPayload ():Buffer;

	/**
	 * Returns the extracted port to which the payload must be relayed to.
	 *
	 * @method core.protocol.hydra.ReadableAdditiveSharingMessageInterface#getPort
	 *
	 * @returns {number}
	 */
	getPort ():number;

}

export = ReadableAdditiveSharingMessageInterface;