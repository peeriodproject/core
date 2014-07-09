/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for an ADDITIVE_SHARING message
 * For more information on the message format, see {@link core.protocol.hydra.AdditiveSharingMessageInterface}
 *
 * @interface
 * @class core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface
 */
interface WritableAdditiveSharingMessageFactoryInterface {

	/**
	 * Constructs the payload for an ADDITIVE_SHARING message.
	 *
	 * @method core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface#constructMessage
	 *
	 * @param {string} relayToIp The IP of the node to which the payload should be relayed as a CREATE_CELL_ADDITIVE message
	 * @param {number} relayToPort The port of the node to which the payload should be relayed as a CREATE_CELL_ADDITIVE message
	 * @param {Buffer} payload The payload of the message.
	 * @param {number} payloadLength Optional. Number of octets of the payload.
	 *
	 * @returns {Buffer} The resulting payload of an ADDITIVE_SHARING message
	 */
	constructMessage (relayToIp:string, relayToPort:number, payload:Buffer, payloadLength?:number):Buffer;

}

export = WritableAdditiveSharingMessageFactoryInterface;