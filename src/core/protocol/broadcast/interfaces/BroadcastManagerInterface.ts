/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The BroadcastManager handles the broadcasting of messages.
 * When initializing a broadcast, a BroadcastID is generated and added to a list of collected IDs. Furthermore a timeout
 * is set, i.e. the lifetime of the broadcast, indicating the time the ID of the broadcast is stored in the list.
 * The message to broadcast is generated, and from each bucket in the RoutingTable `alpha` random nodes are taken to which
 * the message is sent.
 *
 * On receiving a broadcast message, the following procedure is executed:
 * 1.) Check if the message is still valid, i.e. if the provided timestamp is too old.
 * 2.) If this is the case, do nothing. If this is not the case, check if the ID of the broadcast message is already known.
 * 3.) If this is the case, do nothing. If this is not the case, add the ID to the list of collected IDs. Furthermore set a
 * timeout (the difference between the general lifetime of a broadcast message and how long 'it already lives').
 * Then, a 'receivedBroadcast' is emitted with the payload of the message.
 * 4.) Pipe the message on to `alpha` random nodes from each bucket which has an index less than the highest bit in which MyNode
 * and the sender of the message differ in.
 *
 * @interface
 * @class core.protocol.broadcast.BroadcastManagerInterface
 */
interface BroadcastManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Adds a broadcast ID to the ignore list. Broadcasts received with this ID will not be propagated.
	 * The ignore list is not emptied during the lifetime of the app.
	 *
	 * @method core.protocol.broadcast.BroadcastManagerInterface#ignoreBroadcastId
	 *
	 * @param {string} broadcastId The broadcast ID to ignore.
	 */
	ignoreBroadcastId (broadcastId:string):void;

	/**
	 * Initializes a broadcast in the above described manner.
	 *
	 * @method core.protocol.broadcast.BroadcastManagerInterface#initBroadcast
	 *
	 * @param {string} The broadcast message type
	 * @param {Buffer} payload
	 * @param {string} broadcastId Optional pre-defined broadcastId. If this is specified, no ID will be generated.
	 */
	initBroadcast (messageType:string, payload:Buffer, broadcastId?:string):void;
}

export = BroadcastManagerInterface;
