import events = require('events');

import IncomingDataPipelineInterface = require('./interfaces/IncomingDataPipelineInterface');
import TemporaryMessageMemory = require('./interfaces/TemporaryMessageMemory');
import TemporaryMessageMemoryList = require('./interfaces/TemporaryMessageMemoryList');
import ReadableMessageFactoryInterface = require('./interfaces/ReadableMessageFactoryInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');
import TCPSocketInterface = require('../../net/tcp/interfaces/TCPSocketInterface');

/**
 * IncomingDataPipeline interface implementation.
 *
 * @class core.protocol.messages.IncomingDataPipeline
 * @extends events.EventEmitter
 * @implements core.protocl.messages.IncomingDataPipelineInterface
 *
 * @param {number} maxByteLengthPerMessage The maximum number of bytes a message may have before the memory is discarded.
 * @param {Array<number>} messageEndBytes A byte array indicating that a message is final.
 * @oaram {number} clearTimeoutLength Number of milliseconds to keep data from an unhooked socket until it is released.
 * @param {core.protocol.messages.ReadableMessageFactoryInterface} readableMessageFactory
 */
class IncomingDataPipeline extends events.EventEmitter implements IncomingDataPipelineInterface {

	/**
	 * Indicates how long to keep memory of an unhooked socket before clearing it (in ms).
	 *
	 * @member {number} core.protocol.messages.IncomingDataPipeline~_clearTimeoutLength
	 */
	private _clearTimeoutLength = 0;

	/**
	 * @member {number} core.protocol.messages.IncomingDataPipeline~_maxByteLenghtPerMessage
	 */
	private _maxByteLengthPerMessage = 0;

	/**
	 * @member {Array<number>} core.protocol.messages.IncomingDataPipeline~_messageEndBytes
	 */
	private _messageEndBytes:Array<number> = null;

	/**
	 * @member {core.protocol.messages.ReadableMessageFactoryInterface} core.protocol.messages.IncomingDataPipeline~_readableMessageFactory
	 */
	private _readableMessageFactory:ReadableMessageFactoryInterface = null;

	/**
	 * Keeps references to the `data` listeners.
	 *
	 * @member {Object} core.protocol.messages.IncomingDataPipeline~_socketHooks
	 */
	private _socketHooks:{[id:string]:Function} = {};

	/**
	 * Keeps references to the `identifierChange` listeners.
	 *
	 * @member {Object} core.protocol.messages.IncomingDataPipeline~_identifierHooks
	 */
	private _identifierHooks:{[id:string]:Function} = {};

	/**
	 * Stores the temporary buffers before merging them into a single message buffer. Identified by TCPSocket identifiers.
	 *
	 * @member {core.protocol.messages.TemporaryMessageMemoryList} core.protocol.messages.IncomingDataPipeline~_temporaryBufferStorage
	 */
	private _temporaryBufferStorage:TemporaryMessageMemoryList = {};

	private _doCleanBufferTimeouts:{[id:string]:number} = {};


	constructor (maxByteLengthPerMessage:number, messageEndBytes:Array<number>, clearTimeoutLength:number, readableMessageFactory:ReadableMessageFactoryInterface) {
		super();

		this._maxByteLengthPerMessage = maxByteLengthPerMessage;
		this._readableMessageFactory = readableMessageFactory;

		this._messageEndBytes = messageEndBytes;

		this._clearTimeoutLength = clearTimeoutLength;
	}

	public deformatBuffer (buffer:Buffer):ReadableMessageInterface {
		try {
			return this._readableMessageFactory.create(buffer);
		}
		catch (e) {
			return undefined;
		}
	}

	/**
	 * Returns the socket `data` listener by identifier. Only used for testing purposes.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline#getSocketHookByIdentifier
	 *
	 * @param {string} identifier
	 * @returns {Function}
	 */
	public getSocketHookByIdentifier (identifier:string):Function {

		return this._socketHooks[identifier];
	}

	/**
	 * Returns the temporary memory slot by socket identifier. Only used for testing purposes.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline#getTemporaryMemoryByIdentifier
	 *
	 * @param {string} identifier
	 * @returns {TemporaryMessageMemory} Memory slot
	 */
	public getTemporaryMemoryByIdentifier (identifier:string):TemporaryMessageMemory {

		return this._temporaryBufferStorage[identifier];
	}

	public hookSocket (socket:TCPSocketInterface):void {
		if (!(socket && socket.getIdentifier())) {
			throw new Error('IncomingDataPipeline#hookSocket: Can only hook sockets with identifier');
		}

		var identifier = socket.getIdentifier();

		if (!this._socketHooks[identifier]) {
			var hook_a = (buffer:Buffer) => {
				this._handleIncomingData(buffer, socket);
			};
			this._socketHooks[identifier] = hook_a;
			socket.on('data', hook_a);
		}

		if (!this._identifierHooks[identifier]) {
			var hook_b = (oldIdentifier:string, newIdentifier:string) => {
				this._identifierChange(oldIdentifier, newIdentifier);
			};
			this._identifierHooks[identifier] = hook_b;
			socket.on('identifierChange', hook_b);
		}
	}

	public unhookSocket (socket:TCPSocketInterface):boolean {
		if (socket) {
			var identifier:string = socket.getIdentifier();
			if (identifier) {
				var a = false;
				var b = false;

				if (this._socketHooks[identifier]) {
					socket.removeListener('data', this._socketHooks[identifier]);
					delete this._socketHooks[identifier];
					a = true;
				}

				if (this._identifierHooks[identifier]) {
					socket.removeListener('identifierChange', this._identifierHooks[identifier]);
					delete this._identifierHooks[identifier];
					b = true;
				}

				// temporary buffer storage will only be deleted if no new data comes in within the specified time
				if (!this._doCleanBufferTimeouts[identifier]) {
					this._doCleanBufferTimeouts[identifier] = global.setTimeout(() => {
						this._freeMemory(identifier);
					}, this._clearTimeoutLength);
				}

				return a || b;
			}
		}
		return false;
	}

	/**
	 * Concatenates the temporary memory to one buffer object. As the bytes are copied, references to the segments are dropped.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_concatBufferAndFree
	 *
	 * @param {string} identifier TCP socket identifier
	 * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
	 * @returns {Buffer} Concatenated buffer
	 */
	private _concatBufferAndFree (identifier:string, tempMessageMemory:TemporaryMessageMemory):Buffer {
		var buffer = Buffer.concat(tempMessageMemory.data, tempMessageMemory.length);

		this._freeMemory(identifier, tempMessageMemory);

		return buffer;
	}

	/**
	 * Drops references to the buffer segments stored under an identifer in the temporary buffer storage.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_freeMemory
	 *
	 * @param {string} identifier TCP socket identifier
	 * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
	 */
	private _freeMemory (identifier:string, tempMessageMemory?:TemporaryMessageMemory):void {
		var tempMemory:TemporaryMessageMemory = tempMessageMemory || this._temporaryBufferStorage[identifier];

		if (tempMemory) {
			var dataLen = tempMemory.data.length;

			for (var i = 0; i < dataLen; i++) {
				tempMemory.data[i] = null;
			}
		}

		delete this._temporaryBufferStorage[identifier];
	}

	/**
	 * The entrance function for incoming data. Assigns new data a slot in the temporary buffer storage,
	 * and tries to finalize it in the end. Keeps track of the byte length, so merging later will be faster.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_handleIncomingData
	 *
	 * @param {Buffer} buffer Incoming byte buffer
	 * @param {TCPSocketInterface} socket The socket on which the data was received.
	 */
	private _handleIncomingData (buffer:Buffer, socket:TCPSocketInterface):void {
		var identifier = socket.getIdentifier();

		if (this._doCleanBufferTimeouts[identifier]) {
			global.clearTimeout(this._doCleanBufferTimeouts[identifier]);
			delete this._doCleanBufferTimeouts[identifier];
		}

		if (buffer) {
			var len = buffer.length;
			if (len) {
				var tempMessageMemory:TemporaryMessageMemory = null;
				if (!this._temporaryBufferStorage[identifier]) {
					this._temporaryBufferStorage[identifier] = tempMessageMemory = {
						"length": len,
						"data"  : [buffer]
					};
				}
				else {
					tempMessageMemory = this._temporaryBufferStorage[identifier];
					tempMessageMemory.length += len;
					tempMessageMemory.data.push(buffer);
				}

				this._tryToFinalizeData(identifier, tempMessageMemory);

			}
		}
	}

	/**
	 * The listener on a socket's `identifierChange` event. Saves the data under the new identifier to avoid stowaways.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_identifierChange
	 *
	 * @param {string} oldIdentifier
	 * @param {string} newIdentifier
	 */
	private _identifierChange (oldIdentifier:string, newIdentifier:string):void {
		var sockHook = this._socketHooks[oldIdentifier];
		var identifierHook = this._identifierHooks[oldIdentifier];
		var memorySlot = this._temporaryBufferStorage[oldIdentifier];
		var emptyMemoryTimeout = this._doCleanBufferTimeouts[oldIdentifier];

		if (sockHook) {
			this._socketHooks[newIdentifier] = sockHook;
			delete this._socketHooks[oldIdentifier];
		}

		if (identifierHook) {
			this._identifierHooks[newIdentifier] = identifierHook;
			delete this._identifierHooks[oldIdentifier];
		}

		if (memorySlot) {
			this._temporaryBufferStorage[newIdentifier] = memorySlot;
			delete this._temporaryBufferStorage[oldIdentifier];
		}

		if (emptyMemoryTimeout) {
			this._doCleanBufferTimeouts[newIdentifier] = emptyMemoryTimeout;
			delete this._doCleanBufferTimeouts[oldIdentifier];
		}

	}

	/**
	 * Checks whether a tmeporary message memory slot constitutes a full message. This is determined by comparing
	 * the last bytes to the `messageEndBytes` provided in the constructor.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_freeMemory
	 *
	 * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
	 * @returns {boolean} `True` if message is complete, `false` if not complete
	 */
	private _memoryIsCompleteMessage (tempMessageMemory:TemporaryMessageMemory):boolean {
		var endBytes = this._messageEndBytes;

		if (tempMessageMemory.length < endBytes.length) {
			return false;
		}

		var byteToCheck = endBytes.length - 1;
		var retVal:boolean = true;

		for (var i = tempMessageMemory.data.length - 1; i >= 0; i--) {
			var buf = tempMessageMemory.data[i];
			var bufLen = buf.length;
			var beginAt = buf.length - 1;

			var done = false;
			for (var j = 0; j < bufLen; j++) {
				if (byteToCheck < 0) {
					done = true;
					break;
				}

				if (buf[beginAt - j] !== endBytes[byteToCheck]) {
					retVal = false;
					done = true;
					break;
				}
				else {
					byteToCheck--;
				}
			}

			if (done) {
				break;
			}
		}

		return retVal;
	}

	/**
	 * Calls a check on the temporary memory if the message is complete. If yes, it tries to make a readable message out
	 * of it and emit the `message` event (or `hydraMessage` event respectively). If the message is errorous, nothing is done.
	 * If the temporary buffer exceeds its limit, the references to the memory are dropped.
	 *
	 * @method core.protocol.messages.IncomingDataPipeline~_tryToFinalizeData
	 *
	 * @param {string} identifier TCP socket identifier
	 * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
	 */
	private _tryToFinalizeData (identifier:string, tempMessageMemory:TemporaryMessageMemory):void {
		if (this._memoryIsCompleteMessage(tempMessageMemory)) {
			var messageBuffer:Buffer = this._concatBufferAndFree(identifier, tempMessageMemory);

			try {
				var msg:ReadableMessageInterface = this._readableMessageFactory.create(messageBuffer);
				this.emit(msg.isHydra() ? 'hydraMessage' : 'message', identifier, msg);
			}
			catch (e) {
				this.emit('unreadableMessage', identifier);
			}
		}
		else if (tempMessageMemory.length > this._maxByteLengthPerMessage) {
			this._freeMemory(identifier, tempMessageMemory);
		}
	}

}


export = IncomingDataPipeline;