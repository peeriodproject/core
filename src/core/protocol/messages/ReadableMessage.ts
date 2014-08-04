import net = require('net');

import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeFactoryInterface = require('../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');
import ContactNodeAddressExtractor = require('./ContactNodeAddressExtractor');

import Id = require('../../topology/Id');
import MessageByteCheatsheet = require('./MessageByteCheatsheet');

/**
 * @class core.protocol.messages.ReadableMessage
 * @implements core.protocol.messages.ReadableMessageInterface
 *
 * @param {Buffer} buffer The message buffer
 * @param {core.topology.ContactNodeFactoryInterface} nodeFactory A contact node factory
 * @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory An address factory.
 */
class ReadableMessage implements ReadableMessageInterface {

	/**
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessage~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	/**
	 * The message buffer.
	 *
	 * @member {Buffer} core.protocol.messages.ReadableMessage~_buffer
	 */
	private _buffer:Buffer = null;

	/**
	 * Length of the message buffer.
	 *
	 * @member {number} core.protocol.messages.ReadableMessage~_bufferLength
	 */
	private _bufferLength:number = 0;

	/**
	 * Indicates whether this is a hydra message.
	 *
	 * @member {boolean} core.protocol.messages.ReadableMessage~_isHydra
	 */
	private _isHydra:boolean = false;

	/**
	 * A helper member for remembering which bytes have already been read and processed.
	 *
	 * @member {number}  core.protocol.messages.ReadableMessage~_lastPosRead
	 */
	private _lastPosRead:number = 0;

	/**
	 * The type of protocol message (e.g. PING, PONG, etc.)
	 *
	 * @member {string} core.protocol.messages.ReadableMessage~_messageType
	 */
	private _messageType:string = null;

	/**
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessage~_nodeFactory
	 */
	private _nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * The slice of message buffer constituting the payload of the message.
	 *
	 * @member {Buffer} core.protocol.messages.ReadableMessage~_payload
	 */
	private _payload:Buffer = null;

	/**
	 * The ID of the intended receiver of the message.
	 *
	 * @member {core.topology.IdInterface} core.protocol.messages.ReadableMessage~_receiverId
	 */
	private _receiverId:IdInterface = null;

	/**
	 * The sender object.
	 *
	 * @member {core.topology.ContactNodeInterface} core.protocol.messages.ReadableMessage~_sender
	 */
	private _sender:ContactNodeInterface = null;

	constructor (buffer:Buffer, nodeFactory:ContactNodeFactoryInterface, addressFactory:ContactNodeAddressFactoryInterface) {
		this._buffer = buffer;
		this._nodeFactory = nodeFactory;
		this._addressFactory = addressFactory;
		this._bufferLength = buffer.length;

		this._deformat();
	}

	public discard ():void {
		this._buffer = null;
		this._payload = null;
	}

	public getMessageType ():string {
		return this._messageType;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	public getRawBuffer ():Buffer {
		return this._buffer;
	}

	public getReceiverId ():IdInterface {
		return this._receiverId;
	}

	public getSender ():ContactNodeInterface {
		return this._sender;
	}

	public isHydra ():boolean {
		return this._isHydra;
	}

	/**
	 * Kicks off the extracting process.
	 *
	 * @method core.protocol.messages.ReadableMessage~_deformat
	 */
	private _deformat ():void {
		/*if (!this._isProtocolMessage()) {
			throw new Error('ReadableMessage~_deformat: Buffer is not protocol compliant.');
		}*/

		//this._lastPosRead = MessageByteCheatsheet.messageBegin.length;

		this._lastPosRead = this._extractReceiverId(this._lastPosRead);

		if (this._isHydra) {
			this._extractPayload(this._lastPosRead);
			return;
		}

		this._lastPosRead = this._extractSenderAsContactNode(this._lastPosRead);

		this._lastPosRead = this._extractMessageType(this._lastPosRead);

		this._lastPosRead = this._extractPayload(this._lastPosRead);

	}

	/**
	 * Extracts a 20 byte ID from the message buffer.
	 *
	 * @method core.protocol.messages.ReadableMessage~_extractId
	 *
	 * @param {number} from Byte index to start from
	 * @returns {Id} The created ID
	 */
	private _extractId (from:number):IdInterface {
		var idBuffer:Buffer = new Buffer(20);

		this._buffer.copy(idBuffer, 0, from, from + 20);

		return new Id(idBuffer, 160)
	}

	/**
	 * Extracts the slice of the message buffer representing the message payload.
	 *
	 * @method core.protocol.messages.ReadableMessage~_extractPayload
	 *
	 * @param {number} from Byte index to start from
	 * @returns {number} Index of last byte read.
	 */
	private _extractPayload (from:number):number {
		//this._payload = this._buffer.slice(from, this._buffer.length - MessageByteCheatsheet.messageEnd.length);
		this._payload = this._buffer.slice(from, this._buffer.length);
		return from + this._payload.length;
	}

	/**
	 * Extracts the protocol message type.
	 *
	 * @method core.protocol.messages.ReadableMessage~_extractMessageType
	 *
	 * @param {number} from Byte index to start from
	 * @returns {number} The index of the last byte read
	 */
	private _extractMessageType (from:number):number {
		var msgTypeBytes:Buffer = this._buffer.slice(from, from + 2);
		var messageTypes = MessageByteCheatsheet.messageTypes;
		var typesClear = Object.keys(messageTypes);
		var result:string = null;

		for (var i=0; i<typesClear.length; i++) {
			var typeClear = typesClear[i];
			var bytes = messageTypes[typeClear];

			if (msgTypeBytes[0] === bytes[0] && msgTypeBytes[1] === bytes[1]) {
				result = typeClear;
				break;
			}
		}

		if (!result) {
			throw new Error('ReadableMessage~_extractMessageType: Unknown message type.');
		}

		this._messageType = result;

		return from + 2;
	}

	/**
	 * Extracts the ID of the intended receiver. If the id is merely null bytes, the message seems to be a hydra message.
	 *
	 * @method core.protocol.messages.ReadableMessage~_extractReceiverId
	 *
	 * @param {number} from The byte index to start from
	 * @returns {number} The index of the last byte read
	 */
	private _extractReceiverId (from:number):number {
		this._receiverId = this._extractId(from);

		var buffer:Buffer = this._receiverId.getBuffer();
		var isHydra:boolean = true;

		for (var i=0; i<buffer.length; i++) {
			if (buffer[i] !== 0x00) {
				isHydra = false;
				break;
			}
		}

		this._isHydra = isHydra;

		return from + 20;
	}


	/**
	 * Extracts the sender ID and address block and makes ContactNode out of it.
	 *
	 * @method core.protocol.messages.ReadableMessage~_extractSenderAsContactNode
	 *
	 * @param {number} from Byte index to start from.
	 * @returns {number} Index of the last byte read.
	 */
	private _extractSenderAsContactNode (from:number):number {
		var senderId:IdInterface = this._extractId(from);

		from += 20;

		var res = ContactNodeAddressExtractor.extractAddressesAndBytesReadAsArray(this._buffer, this._addressFactory, from);
		var senderAddresses:ContactNodeAddressListInterface = res[0];

		this._sender = this._nodeFactory.create(senderId, senderAddresses);

		return res[1];
	}

	/**
	 * @deprecated
	 *
	 * Checks whether the message buffer starts and ends with the expected 6 byte-identifiers.
	 *
	 * @method core.protocol.message.ReadableMessage~_isProtocolMessage
	 *
	 * @returns {boolean} `True` if protocol message, `false` if not.
	 */
	private _isProtocolMessage ():boolean {
		var msgBegin = MessageByteCheatsheet.messageBegin;
		var msgEnd = MessageByteCheatsheet.messageEnd;

		if (this._bufferLength < msgBegin.length + msgEnd.length) {
			return false;
		}

		for (var i=0; i<msgBegin.length; i++) {
			if (this._buffer[i] !== msgBegin[i]) {
				return false;
			}
		}

		for (var i=0; i<msgEnd.length; i++) {
			if (this._buffer[this._bufferLength - (6 - i)] !== msgEnd[i]) {
				return false;
			}
		}

		return true;
	}

}

export = ReadableMessage;