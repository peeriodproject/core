/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');
import MyNodeInterface = require('../../../topology/interfaces/MyNodeInterface');
import WritableMessageFactoryInterface = require('./WritableMessageFactoryInterface');

/**
 * The 'uppermost' wrapper around any protocol message. Adds the sender/receiver information, the type of message etc.,
 * so that any message can be recognized as a protocol message by other participants.
 *
 * See {@link core.protocol.messages.ReadableMessageInterface} for more information of what constitutes a correct
 * protocol message.
 *
 * @interface
 * @class core.protocol.messages.GeneralWritableMessageFactoryInterface
 * @class core.protocol.messages.WritableMessageFactoryInterface
 */
interface GeneralWritableMessageFactoryInterface extends WritableMessageFactoryInterface {

	/**
	 * Sets the human-readable type of the message (which will later be substituted with the correct bytes) of the
	 * following message.
	 * This is reset to `null` after every message creation, so that a message isn't falsely created.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactoryInterface#setMessageType
	 *
	 * @param {string} type Type of message
	 */
	setMessageType (type:string):void;

	/**
	 * Sets the receiver of the following message.
	 * This is reset to `null` after every message creation, so that a message isn't falsely created.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactoryInterface#setReceiver
	 *
	 * @param {core.topology.ContactNodeInterface} node The receiver
	 */
	setReceiver (node:ContactNodeInterface):void;

	/**
	 * Sets the sender which is used for creating messages. This can be set once and then never changed.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactoryInterface#setSender
	 *
	 * @param {core.topology.MyNodeInterface} node The sender
	 */
	setSender (node:MyNodeInterface):void;

	/**
	 * Constructs a general hydra message, i.e. a message where the bytes reserved for the receiver ID are all 0x00,
	 * followed directly by the payload.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactoryInterface#hydraConstructMessage
	 *
	 * @param {Buffer} payload Payload to wrap
	 * @param {number} payloadLength Optional number of bytes of the payload
	 */
	hydraConstructMessage (payload:Buffer, payloadLength?:number):Buffer;

}

export = GeneralWritableMessageFactoryInterface;