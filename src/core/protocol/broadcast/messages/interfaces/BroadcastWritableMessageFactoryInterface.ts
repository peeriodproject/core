/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for BROADCAST messages.
 * For more information about how such a message is structured, see
 * {@link core.protocol.broadcast.BroadcastReadableMessageInterface}
 *
 * @interface
 * @class core.protocol.broadcast.BroadcastWritableMessageFactoryInterface
 */
interface BroadcastWritableMessageFactoryInterface {

	/**
	 * Constructs the payload from the given arguments for a BROADCAST message.
	 *
	 * @method core.protocol.broadcast.BroadcastWritableMessageFactoryInterface#constructPayload
	 *
	 * @param {string} broadcastId The broadcast ID
	 * @param {Buffer} payload The broadcast payload
	 */
	constructPayload (broadcastId:string, payload:Buffer, payloadLength?:number):Buffer;
}

export = BroadcastWritableMessageFactoryInterface;