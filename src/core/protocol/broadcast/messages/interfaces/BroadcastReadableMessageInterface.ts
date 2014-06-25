/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * A BroadcastReadableMessage represents a BROADCAST protocol message.
 * It constitutes itself in the following way:
 *
 * 1.) 8 Bytes for a broadcast ID, referencing the broadcast cycle of the payload.
 * 2.) 8 Bytes for the timestamp indicating when the broadcast has been initiated. Initiations older than a given time MUST NOT
 * be broadcast any further
 * 3.) The actual broadcast payload
 *
 * @interface
 * @class core.protocol.broadcast.BroadcastReadableMessageInterface
 */
interface BroadcastReadableMessageInterface {

	/**
	 * Returns the 8 byte broadcast ID as hex string.
	 *
	 * @method core.protocol.broadcast.BroadcastReadableMessageInterface#getBroadcastId
	 *
	 * @returns {string}
	 */
	getBroadcastId ():string;

	/**
	 * Returns the actual broadcast payload
	 *
	 * @method core.protocol.broadcast.BroadcastReadableMessageInterface#getPayload
	 *
	 * @returns {Buffer}
	 */
	getPayload ():Buffer;

	/**
	 * Returns the UNIX timestamp indicating when the broadcast has been initiated.
	 *
	 * @method core.protocol.broadcast.BroadcastReadableMessageInterface#getTimestamp
	 *
	 * @returns {number}
	 */
	getTimestamp ():number;
}

export = BroadcastReadableMessageInterface;