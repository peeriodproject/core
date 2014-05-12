/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import IdInterface = require('../../../topology/interfaces/IdInterface');
import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');

/**
 * The ReadableMessageInterface is an important part of the protocol core. Every message on the network is formatted after
 * a specific pattern. A ReadableMessage must deconstruct a raw buffer into its parts.
 *
 * Roughly, a protocol message is structured into the following parts:
 * - 6 Bytes for indicating it is a protocol message
 * - 20 Bytes for the ID of the intended receiver
 * - 20 Bytes for the ID of the sender
 * - The address block, constituted by lists of IP/PORT combinations, each beginning with an indicator byte which tells if:
 *     * IPv4 (followed by 6 reserved bytes for the address)
 *     * IPv6 (foolowed by 18 reserved bytes for the address)
 * - One indicator byte for the termination of the address block
 * - Two bytes for the type of protocol message (e.g. PING)
 * - The payload
 * - 6 Bytes for indicating the end of the protocol message
 *
 * If the 20 Bytes reserved for the ID of the intended receiver are all null-bytes, the message is marked as a hydra
 * message and the payload is expected to follow right after (without addresses, sender etc.)
 *
 * @interface
 * @class core.protocol.messages.ReadableMessageInterface
 */
interface ReadableMessageInterface {

	/**
	 * Sets payload buffer and message buffer to `null`.
	 */
	discard ():void;

	/**
	 * Returns the extracted message type (e.g. PING, PONG etc.)
	 *
	 * @returns {string}
	 */
	getMessageType ():string;

	/**
	 * Returns the slice of the message buffer constituting the payload.
	 * ATTENTION: Payload and message buffer reference the same memory, so altering it in one place will change it
	 * in the other one as well.
	 *
	 * @returns {Buffer}
	 */
	getPayload ():Buffer;

	/**
	 * Returns the extracted ID of receiver.
	 *
	 * @returns {core.topology.IdInterface}
	 */
	getReceiverId ():IdInterface;

	/**
	 * Returns the extracted Contact Node
	 *
	 * @returns {core.topology.ContactNodeInterface}
	 */
	getSender ():ContactNodeInterface;

	/**
	 * Returns whether the message is recognized as a hydra message.
	 *
	 * @returns {boolean}
	 */
	isHydra ():boolean;

}

export = ReadableMessageInterface;