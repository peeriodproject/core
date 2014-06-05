var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

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
var IncomingDataPipeline = (function (_super) {
    __extends(IncomingDataPipeline, _super);
    function IncomingDataPipeline(maxByteLengthPerMessage, messageEndBytes, clearTimeoutLength, readableMessageFactory) {
        _super.call(this);
        /**
        * Indicates how long to keep memory of an unhooked socket before clearing it (in ms).
        *
        * @member {number} core.protocol.messages.IncomingDataPipeline~_clearTimeoutLength
        */
        this._clearTimeoutLength = 0;
        /**
        * @member {number} core.protocol.messages.IncomingDataPipeline~_maxByteLenghtPerMessage
        */
        this._maxByteLengthPerMessage = 0;
        /**
        * @member {Array<number>} core.protocol.messages.IncomingDataPipeline~_messageEndBytes
        */
        this._messageEndBytes = null;
        /**
        * @member {core.protocol.messages.ReadableMessageFactoryInterface} core.protocol.messages.IncomingDataPipeline~_readableMessageFactory
        */
        this._readableMessageFactory = null;
        /**
        * Keeps references to the `data` listeners.
        *
        * @member {Object} core.protocol.messages.IncomingDataPipeline~_socketHooks
        */
        this._socketHooks = {};
        /**
        * Keeps references to the `identifierChange` listeners.
        *
        * @member {Object} core.protocol.messages.IncomingDataPipeline~_identifierHooks
        */
        this._identifierHooks = {};
        /**
        * Stores the temporary buffers before merging them into a single message buffer. Identified by TCPSocket identifiers.
        *
        * @member {core.protocol.messages.TemporaryMessageMemoryList} core.protocol.messages.IncomingDataPipeline~_temporaryBufferStorage
        */
        this._temporaryBufferStorage = {};
        this._doCleanBufferTimeouts = {};

        this._maxByteLengthPerMessage = maxByteLengthPerMessage;
        this._readableMessageFactory = readableMessageFactory;

        this._messageEndBytes = messageEndBytes;

        this._clearTimeoutLength = clearTimeoutLength;
    }
    IncomingDataPipeline.prototype.deformatBuffer = function (buffer) {
        try  {
            return this._readableMessageFactory.create(buffer);
        } catch (e) {
            return undefined;
        }
    };

    /**
    * Returns the socket `data` listener by identifier. Only used for testing purposes.
    *
    * @method core.protocol.messages.IncomingDataPipeline#getSocketHookByIdentifier
    *
    * @param {string} identifier
    * @returns {Function}
    */
    IncomingDataPipeline.prototype.getSocketHookByIdentifier = function (identifier) {
        return this._socketHooks[identifier];
    };

    /**
    * Returns the temporary memory slot by socket identifier. Only used for testing purposes.
    *
    * @method core.protocol.messages.IncomingDataPipeline#getTemporaryMemoryByIdentifier
    *
    * @param {string} identifier
    * @returns {TemporaryMessageMemory} Memory slot
    */
    IncomingDataPipeline.prototype.getTemporaryMemoryByIdentifier = function (identifier) {
        return this._temporaryBufferStorage[identifier];
    };

    IncomingDataPipeline.prototype.hookSocket = function (socket) {
        var _this = this;
        if (!(socket && socket.getIdentifier())) {
            throw new Error('IncomingDataPipeline#hookSocket: Can only hook sockets with identifier');
        }

        var identifier = socket.getIdentifier();

        if (!this._socketHooks[identifier]) {
            var hook_a = function (buffer) {
                _this._handleIncomingData(buffer, socket);
            };
            this._socketHooks[identifier] = hook_a;
            socket.on('data', hook_a);
        }

        if (!this._identifierHooks[identifier]) {
            var hook_b = function (oldIdentifier, newIdentifier) {
                _this._identifierChange(oldIdentifier, newIdentifier);
            };
            this._identifierHooks[identifier] = hook_b;
            socket.on('identifierChange', hook_b);
        }
    };

    IncomingDataPipeline.prototype.unhookSocket = function (socket) {
        var _this = this;
        if (socket) {
            var identifier = socket.getIdentifier();
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
                    this._doCleanBufferTimeouts[identifier] = global.setTimeout(function () {
                        _this._freeMemory(identifier);
                    }, this._clearTimeoutLength);
                }

                return a || b;
            }
        }
        return false;
    };

    /**
    * Concatenates the temporary memory to one buffer object. As the bytes are copied, references to the segments are dropped.
    *
    * @method core.protocol.messages.IncomingDataPipeline~_concatBufferAndFree
    *
    * @param {string} identifier TCP socket identifier
    * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
    * @returns {Buffer} Concatenated buffer
    */
    IncomingDataPipeline.prototype._concatBufferAndFree = function (identifier, tempMessageMemory) {
        var buffer = Buffer.concat(tempMessageMemory.data, tempMessageMemory.length);

        this._freeMemory(identifier, tempMessageMemory);

        return buffer;
    };

    /**
    * Drops references to the buffer segments stored under an identifer in the temporary buffer storage.
    *
    * @method core.protocol.messages.IncomingDataPipeline~_freeMemory
    *
    * @param {string} identifier TCP socket identifier
    * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
    */
    IncomingDataPipeline.prototype._freeMemory = function (identifier, tempMessageMemory) {
        var tempMemory = tempMessageMemory || this._temporaryBufferStorage[identifier];

        if (tempMemory) {
            var dataLen = tempMemory.data.length;

            for (var i = 0; i < dataLen; i++) {
                tempMemory.data[i] = null;
            }
        }

        delete this._temporaryBufferStorage[identifier];
    };

    /**
    * The entrance function for incoming data. Assigns new data a slot in the temporary buffer storage,
    * and tries to finalize it in the end. Keeps track of the byte length, so merging later will be faster.
    *
    * @method core.protocol.messages.IncomingDataPipeline~_handleIncomingData
    *
    * @param {Buffer} buffer Incoming byte buffer
    * @param {TCPSocketInterface} socket The socket on which the data was received.
    */
    IncomingDataPipeline.prototype._handleIncomingData = function (buffer, socket) {
        var identifier = socket.getIdentifier();

        if (this._doCleanBufferTimeouts[identifier]) {
            global.clearTimeout(this._doCleanBufferTimeouts[identifier]);
            delete this._doCleanBufferTimeouts[identifier];
        }

        if (buffer) {
            var len = buffer.length;
            if (len) {
                var tempMessageMemory = null;
                if (!this._temporaryBufferStorage[identifier]) {
                    this._temporaryBufferStorage[identifier] = tempMessageMemory = {
                        "length": len,
                        "data": [buffer]
                    };
                } else {
                    tempMessageMemory = this._temporaryBufferStorage[identifier];
                    tempMessageMemory.length += len;
                    tempMessageMemory.data.push(buffer);
                }

                this._tryToFinalizeData(identifier, tempMessageMemory);
            }
        }
    };

    /**
    * The listener on a socket's `identifierChange` event. Saves the data under the new identifier to avoid stowaways.
    *
    * @method core.protocol.messages.IncomingDataPipeline~_identifierChange
    *
    * @param {string} oldIdentifier
    * @param {string} newIdentifier
    */
    IncomingDataPipeline.prototype._identifierChange = function (oldIdentifier, newIdentifier) {
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
    };

    /**
    * Checks whether a tmeporary message memory slot constitutes a full message. This is determined by comparing
    * the last bytes to the `messageEndBytes` provided in the constructor.
    *
    * @method core.protocol.messages.IncomingDataPipeline~_freeMemory
    *
    * @param {core.protocol.messages.TemporaryMessageMemory} tempMessageMemory The temporary buffer storage slot
    * @returns {boolean} `True` if message is complete, `false` if not complete
    */
    IncomingDataPipeline.prototype._memoryIsCompleteMessage = function (tempMessageMemory) {
        var endBytes = this._messageEndBytes;

        if (tempMessageMemory.length < endBytes.length) {
            return false;
        }

        var byteToCheck = endBytes.length - 1;
        var retVal = true;

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
                } else {
                    byteToCheck--;
                }
            }

            if (done) {
                break;
            }
        }

        return retVal;
    };

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
    IncomingDataPipeline.prototype._tryToFinalizeData = function (identifier, tempMessageMemory) {
        if (this._memoryIsCompleteMessage(tempMessageMemory)) {
            var messageBuffer = this._concatBufferAndFree(identifier, tempMessageMemory);

            try  {
                var msg = this._readableMessageFactory.create(messageBuffer);
                this.emit(msg.isHydra() ? 'hydraMessage' : 'message', identifier, msg);
            } catch (e) {
                this.emit('unreadableMessage', identifier);
            }
        } else if (tempMessageMemory.length > this._maxByteLengthPerMessage) {
            this._freeMemory(identifier, tempMessageMemory);
        }
    };
    return IncomingDataPipeline;
})(events.EventEmitter);

module.exports = IncomingDataPipeline;
//# sourceMappingURL=IncomingDataPipeline.js.map
