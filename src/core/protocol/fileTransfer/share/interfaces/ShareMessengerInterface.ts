/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The ShareMessenger shall take the role of sending shares messages in a download/upload process.
 * It works in a question-and-answer fashion: The messenger sends out the message and waits for a specific response on this message,
 * only then is the message treated as acknowledged, and another message can be sent.
 *
 * The messenger always tries to reuse the circuit through which an expected response has come through, with the expectation that
 * if a message has been successfully retrieved through the circuit,
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ShareMessengerInterface
 */
interface ShareMessengerInterface {

	/**
	 * Manually sets the preferred circuit by identifier when piping the next message.
	 *
	 * @methdo core.protocol.fileTransfer.share.ShareMessengerInterface#manuallySetPreferredCircuitId
	 *
	 * @param {string} circuitId The identifier of the circuit to prefer.
	 */
	manuallySetPreferredCircuitId (circuitId:string):void;

	/**
	 * Sends a last message (if possible) without waiting for a response. This marks the end of the messaging process.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessengerInterface#pipeLastMessage
	 *
	 * @param {Buffer} payloadToFeed The message to feed
	 * @param {Buffer} nodesToFeedBlock The buffer representation of the nodes to feed.
	 */
	pipeLastMessage (payloadToFeed:Buffer, nodesToFeedBlock:Buffer):void;

	/**
	 * Sends a message and waits for a response message of the provided expected type and the provided expected transfer identifier.
	 * Tries to issue a feeding instruction through a circuit. If no circuit is present, waits until there is a circuit to use.
	 * After issuing the feeding instruction, a timeout is set to wait for the expected response. If it elapses, and no response has rolled in,
	 * the message is sent again, and the timeout is set again. This is repeated until a maximum number of retries is exhausted.
	 *
	 * If a response comes in, or the maximum tries have been exhausted, the provided callback is fired with an error argument (which can be `null`)
	 * and the payload of the reaction message.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessengerInterface#pipeMessageAndWaitForResponse
	 *
	 * @param {Buffer} payloadToFeed The message to feed
	 * @param {Buffer} nodesToFeedBlock The buffer representation of the nodes to feed
	 * @param {string} expectedMessageType The message type of the expected response
	 * @param {string} expectedTransferIdentifier The transfer identifier of the expected response
	 * @param {Function} callback The callback method. See above.
	 */
	pipeMessageAndWaitForResponse (payloadToFeed:Buffer, nodesToFeedBlock:Buffer, expectedMessageType:string, expectedTransferIdentifier:string, callback:(err:Error, reactionMessagePayload:Buffer) => any):void;

	/**
	 * Tears down the last circuit through which an expected response message came through (if present). This is useful for cleaning up on
	 * protocol non-compliance.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessengerInterface#teardownLatestCircuit
	 */
	teardownLatestCircuit ():void;

}

export = ShareMessengerInterface;