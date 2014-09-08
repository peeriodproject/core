/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import MiddlewareInterface = require('./MiddlewareInterface');

/**
 * The TransferMessageCenter lives on the line between the hydra circuits and all messages related to file transfers,
 * e.g. query, broadcasts, the relaying of message between circuits (that is, the 'connecting' of two unrelated circuits)
 * and the unwrapping of messages.
 *
 * @interface
 * @class core.protocol.fileTransfer.TransferMessageCenterInterface
 * @extends NodeJS.EventEmitter
 */
interface TransferMessageCenterInterface extends NodeJS.EventEmitter {

	/**
	 * Given a payload, which should be the message that is intended for the initiator of a circuit, this method tells one
	 * of the client's own circuit end-points to feed the end point of a circuit of the intended receiver.
	 *
	 * The message is wrapped within an EXTERNAL_FEED message (with zero bytes as transferId) and piped through one of the
	 * circuits. If a circuitId is given, this exact circuit is used if present. If not present, a random circuit is used.
	 * If no circutiId is given, a random circuit is used all the same.
	 *
	 * @method core.protocol.fileTransfer.TransferMessageCenterInterface#issueExternalFeedToCircuit
	 *
	 * @param {Buffer} nodesToFeedBlock A byte buffer block of potential nodes to feed the message to. These nodes must be
	 * related to one of the circuits of the payload's intended receiver.
	 * This is needed for the exit node's middleware.
	 * @param {Buffer} payload The full message for the receiver, usually the payload of a FILE_TRANSFER message. (no FILE_TRANSFER indicator byte!)
	 * @param {string} circuitId Optional identifier of the circuit to pipe the message through.
	 * @returns {boolean} `true` if the EXTERNAL_FEED message could be piped through a circuit, else `false`
	 */
	issueExternalFeedToCircuit (nodesToFeedBlock:Buffer, payload:Buffer, circuitId?:string):boolean;

	/**
	 * Sets the middleware instance on the transfer message center.
	 *
	 * @method core.protocol.fileTransfer.TransferMessageCenterInterface#setMiddleware
	 *
	 * @param {core.protocol.fileTransfer.MiddlewareInterface} middleware A working middleware instance.
	 */
	setMiddleware (middleware:MiddlewareInterface):void;

	/**
	 * Returns the full payload of a FILE_TRANSFER message with the given messageType, transferIdentifier and payload.
	 * Note: This function returns the buffer of a subtype of FILE_TRANSFER messages, not the full buffer of a WHOLE FILE_TRANSFER
	 * message (i.e. no FILE_TRANSFER indicator byte).
	 *
	 * @method core.protocol.fileTransfer.TransferMessageCenterInterface#wrapTransferMessage
	 *
	 * @param {string} messageType
	 * @param {string} transferId
	 * @param {Buffer} payload
	 * @returns {Buffer}
	 */
	wrapTransferMessage (messageType:string, transferId:string, payload:Buffer):Buffer;

}

export = TransferMessageCenterInterface;