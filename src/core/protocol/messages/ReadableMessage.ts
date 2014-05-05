import net = require('net');

import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeFactoryInterface = require('../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');

import Id = require('../../topology/Id');
import MessageByteCheatsheet = require('./MessageByteCheatsheet');

/**
 * @class core.protocol.messages.ReadableMessage
 * @implements core.protocol.messages.ReadableMessageInterface
 */
class ReadableMessage implements ReadableMessageInterface {

	/**
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessage~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	/**
	 * @member {Buffer} core.protocol.messages.ReadableMessage~_buffer
	 */
	private _buffer:Buffer = null;

	/**
	 * @member {number} core.protocol.messages.ReadableMessage~_bufferLength
	 */
	private _bufferLength:number = 0;

	/**
	 * @member {number}  core.protocol.messages.ReadableMessage~_lastPosRead
	 */
	private _lastPosRead:number = 0;

	/**
	 * @member {string} core.protocol.messages.ReadableMessage~_messageType
	 */
	private _messageType:string = null;

	/**
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessage~_nodeFactory
	 */
	private _nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * @member {Buffer} core.protocol.messages.ReadableMessage~_payload
	 */
	private _payload:Buffer = null;

	/**
	 * @member {core.topology.IdInterface} core.protocol.messages.ReadableMessage~_receiverId
	 */
	private _receiverId:IdInterface = null;

	/**
	 * @member {core.topology.ContactNodeInterface} core.protocol.messages.ReadableMessage~_sender
	 */
	private _sender:ContactNodeInterface = null;

	constructor (buffer:Buffer, nodeFactory:ContactNodeFactoryInterface, addressFactory:ContactNodeAddressFactoryInterface) {
		this._buffer = buffer;
		this._bufferLength = buffer.length;
		this._addressFactory = addressFactory;
		this._nodeFactory = nodeFactory;
	}

	public deformat ():void {
		if (!this._isProtocolMessage()) {
			throw new Error('ReadableMessage: Buffer is not protocol compliant.');
		}

		this._lastPosRead = MessageByteCheatsheet.messageBegin.length;

		this._lastPosRead = this._extractReceiverId(this._lastPosRead);

		this._lastPosRead = this._extractSenderAsContactNode(this._lastPosRead);

		this._lastPosRead = this._extractMessageType(this._lastPosRead);

		this._lastPosRead = this._extractPayload(this._lastPosRead);

	}

	public discard ():void {
		this._buffer = null;
		this._payload = null;
	}

	private _contactNodeAddressByIPv4Buffer (buffer:Buffer):ContactNodeAddressInterface {
		var ip:string = buffer.slice(0, 4).toJSON().join('.');
		var port:number = buffer.readUInt16BE(5);

		return this._addressFactory.create(ip, port);
	}

	private _contactNodeAddressByIPv6Buffer (buffer:Buffer):ContactNodeAddressInterface {
		var ip:string = null;
		var port:number = buffer.readUInt16BE(17);

		for (var i=0; i<7; i++) {
			ip += buffer.slice(i * 2, 2).toString('hex');
			if (i !== 6) {
				ip += ':';
			}
		}

		return this._addressFactory.create(ip, port);
	}

	private _extractId (from:number):IdInterface {
		var idBuffer = new Buffer(20);
		this._buffer.copy(idBuffer, 0, from, 20);
		return new Id(idBuffer, 160)
	}

	private _extractPayload (from:number):number {
		this._payload = this._buffer.slice(++from, this._buffer.length - MessageByteCheatsheet.messageEnd.length);
		return from + this._payload.length;
	}

	private _extractMessageType (from:number):number {
		var msgTypeBytes:Buffer = this._buffer.slice(++from, 2);
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

		return ++from;
	}

	private _extractReceiverId (from:number):number {
		this._receiverId = this._extractId(from);
		return from + 20;
	}

	private _extractSenderAsContactNode (from:number):number {
		var senderId:IdInterface = this._extractId(from);
		from += 20;

		var res = this._extractSenderAddressesAndBytesReadAsArray(from);
		var senderAddresses:ContactNodeAddressListInterface = res[0];
		this._sender = this._nodeFactory.create(senderId, senderAddresses);

		return res[1];
	}

	private _extractSenderAddressesAndBytesReadAsArray (from):any {
		var doRead = true;
		var result:ContactNodeAddressListInterface = [];

		while (doRead) {
			var identByte = this._buffer[++from];
			from++;

			if (identByte === MessageByteCheatsheet.ipv4) {
				var bytesToRead = 6;
				result.push(this._contactNodeAddressByIPv4Buffer(this._buffer.slice(from, from + bytesToRead)));
				from += bytesToRead;
			}
			else if (identByte === MessageByteCheatsheet.ipv6) {
				var bytesToRead = 18;
				result.push(this._contactNodeAddressByIPv6Buffer(this._buffer.slice(from, from + bytesToRead)));
				from += bytesToRead;
			}
			else if (identByte === MessageByteCheatsheet.addressEnd) {
				doRead = false;
			}
			else {
				doRead = false;
				throw new Error("ReadableMessage~_extractSenderAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.");
			}
		}

		return [result, from];
	}

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