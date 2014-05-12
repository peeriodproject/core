import GeneralWritableMessageFactoryInterface = require('./interfaces/GeneralWritableMessageFactoryInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import MessageByteCheatsheet = require('./MessageByteCheatsheet');
import IdInterface = require('../../topology/interfaces/IdInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import Id = require('../../topology/Id');

/**
 * GeneralWritableMessageFactoryInterface implementation.
 *
 * @class core.protocol.messages.GeneralWritableMessageFactory
 * @implements core.protocol.messages.GeneralWritableMessageFactoryInterface
 *
 * @todo Swap the sender ContactNodeInterface with a new Class type that extends EventEmitter and that always emits
 * a 'change' event, when the addresses are updated. This can lead to a significant performance gain, because then the
 * address block only has to be constructed when the addresses change.
 *
 * @param {core.topology.ContactNodeInterface} sender Optional sender which will be used for the messages.
 */
class GeneralWritableMessageFactory implements GeneralWritableMessageFactoryInterface {

	/**
	 * The address block as byte representation of the current sender.
	 *
	 * @type {Buffer} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockBuffer
	 */
	private _currentAddressBlockBuffer:Buffer = null;

	/**
	 * Keeps track of the single address block buffers needed to construct the address block
	 *
	 * @type {Array<Buffer>} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockByteList
	 */
	private _currentAddressBlockByteList:Array<Buffer> = null;

	/**
	 * Keeps track of the address block length of the current sender.
	 *
	 * @member {number} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockLength
	 */
	private _currentAddressBlockLength:number = 0;

	/**
	 * @member {string} core.protocol.messages.GeneralWritableMessageFactory~_messageType
	 */
	private _messageType:string = null;

	/**
	 * @member {core.topology.ContactNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_receiver
	 */
	private _receiver:ContactNodeInterface = null;

	/**
	 * @member {core.topology.MyNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_sender
	 */
	private _sender:MyNodeInterface = null;

	/**
	 * Keeps track of the latest hook on the sender's `addressChange` event.
	 *
	 * @member {Function} core.protocol.messages.GeneralWritableMessageFactory~_recentChangeHook
	 */
	private _recentAddressChangeHook:() => any = null;

	/**
	 * Indicator for whether the sender has undergone changes since the last address block creation.
	 *
	 * @member {core.topology.ContactNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_senderHasChanged
	 * @private
	 */
	private _senderHasChanged:boolean = false;

	public constructor (sender?:MyNodeInterface) {
		if (sender) {
			this.setSender(sender);
		}
	}

	public setMessageType (type:string):void {
		this._messageType = type;
	}

	public setReceiver (node:ContactNodeInterface):void {
		this._receiver = node;
	}

	public setSender (node:MyNodeInterface):void {
		if (this._sender !== node) {
			if (this._sender && this._recentAddressChangeHook) {
				this._sender.removeOnAddressChange(this._recentAddressChangeHook);
			}

			this._recentAddressChangeHook = ():any => {
				this._senderHasChanged = true;
			};

			node.onAddressChange(this._recentAddressChangeHook);
			this._senderHasChanged = true;
		}
		this._sender = node;
	}

	public hydraConstructMessage (payload:Buffer, payloadLength?:number):Buffer {
		var bufferLength:number = (payloadLength === undefined) ? payload.length : payloadLength;
		var bufferList:Array<Buffer> = [];

		// add the beginning bytes
		bufferList.push(new Buffer(MessageByteCheatsheet.messageBegin));
		bufferLength += MessageByteCheatsheet.messageBegin.length;

		// add 20 null bytes
		var nullBuf = new Buffer(20);
		nullBuf.fill(0x00);
		bufferList.push(nullBuf);
		bufferLength += 20;

		// add the payload
		bufferList.push(payload);

		// add the ending bytes
		bufferList.push(new Buffer(MessageByteCheatsheet.messageEnd));
		bufferLength += MessageByteCheatsheet.messageEnd.length;

		return Buffer.concat(bufferList, bufferLength);
	}

	public constructMessage (payload:Buffer, payloadLength?:number):Buffer {
		if (!(this._receiver && this._sender && this._messageType)) {
			throw new Error('GeneralWritableMessageFactory#constructMessage: Sender and receiver must be specified.');
		}

		var bufferLength:number = (payloadLength === undefined) ? payload.length : payloadLength;
		var bufferList:Array<Buffer> = [];

		// add the beginning bytes
		bufferList.push(new Buffer(MessageByteCheatsheet.messageBegin));
		bufferLength += MessageByteCheatsheet.messageBegin.length;

		// add the receiver ID
		bufferList.push(this._receiver.getId().getBuffer());
		bufferLength += 20;

		// add the sender ID
		bufferList.push(this._sender.getId().getBuffer());
		bufferLength += 20;

		// add the address block
		bufferList.push(this._getSenderAddressBlock());
		bufferLength += this._currentAddressBlockLength;

		// add the message type
		var messageTypeByteArray:Array<number> = MessageByteCheatsheet.messageTypes[this._messageType];
		if (!messageTypeByteArray) {
			throw new Error('GeneralWritableMessageFactory#constructMessage: Unknown message type.');
		}
		bufferList.push(new Buffer(messageTypeByteArray));
		bufferLength += messageTypeByteArray.length;

		// add the payload
		bufferList.push(payload);

		// add the ending bytes
		bufferList.push(new Buffer(MessageByteCheatsheet.messageEnd));
		bufferLength += MessageByteCheatsheet.messageEnd.length;

		// cleanup, sender can stay the same
		this._receiver = null;
		this._messageType = null;

		return Buffer.concat(bufferList, bufferLength);
	}

	/**
	 * Only for testing purposes. Should not be used in production.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactory#getSenderHasChanged
	 *
	 * @returns {boolean}
	 */
	public getSenderHasChanged ():boolean {
		return this._senderHasChanged;
	}

	/**
	 * Internal method which iterates over the addresses of the sender and creates an address byte block
	 * with the needed separators which can be included in the header of the message.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactory~_constructSenderAddressBlock
	 *
	 */
	private _constructSenderAddressBlock ():void {
		this._currentAddressBlockByteList = [];
		this._currentAddressBlockLength = 0;

		var addressList:ContactNodeAddressListInterface = this._sender.getAddresses();

		addressList.forEach((address) => { this._onAddressIteration(address); });

		// end the block
		this._currentAddressBlockByteList.push(new Buffer([MessageByteCheatsheet.addressEnd]));

		this._currentAddressBlockLength++;

		this._currentAddressBlockBuffer = null;
		this._currentAddressBlockBuffer = Buffer.concat(this._currentAddressBlockByteList, this._currentAddressBlockLength);

		this._currentAddressBlockByteList = null;
	}


	/**
	 * Checks if the sender has changed since the last time. If yes, a new address block is created.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactory~_getSenderAddressBlock
	 *
	 * @returns {Buffer} The address block buffer object
	 */
	private _getSenderAddressBlock ():Buffer {
		if (this._senderHasChanged) {
			this._constructSenderAddressBlock();
			this._senderHasChanged = false;
		}
		return this._currentAddressBlockBuffer;
	}

	/**
	 * Internal method used when iteration over the sender's address list.
	 *
	 * @method core.protocol.messages.GeneralWritableMessageFactory~_getSenderAddressBlock
	 */
	private _onAddressIteration (address:ContactNodeAddressInterface):void {
		var indicatorByte:Buffer = new Buffer(1);
		var addressBuffer:Buffer = address.getAddressAsByteBuffer();

		if (address.isIPv4()) {
			indicatorByte[0] = MessageByteCheatsheet.ipv4;
		}
		else if (address.isIPv6()) {
			indicatorByte[0] = MessageByteCheatsheet.ipv6;
		}

		this._currentAddressBlockLength++;
		this._currentAddressBlockByteList.push(indicatorByte);

		this._currentAddressBlockLength += addressBuffer.length;
		this._currentAddressBlockByteList.push(addressBuffer);
	}


}

export = GeneralWritableMessageFactory;