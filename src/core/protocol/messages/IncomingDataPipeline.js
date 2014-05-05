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
* @param {core.protocol.messages.ReadableMessageFactoryInterface} readableMessageFactory
*/
var IncomingDataPipeline = (function (_super) {
    __extends(IncomingDataPipeline, _super);
    function IncomingDataPipeline(maxByteLengthPerMessage, messageEndBytes, readableMessageFactory) {
        _super.call(this);
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
        this._socketHooks = null;
        /**
        * Stores the temporary buffers before merging them into a single message buffer. Identified by TCPSocket identifiers.
        *
        * @member {core.protocol.messages.TemporaryMessageMemoryList} core.protocol.messages.IncomingDataPipeline~_temporaryBufferStorage
        */
        this._temporaryBufferStorage = {};

        this._maxByteLengthPerMessage = maxByteLengthPerMessage;
        this._readableMessageFactory = readableMessageFactory;

        this._messageEndBytes = messageEndBytes;
    }
    IncomingDataPipeline.prototype.hookSocket = function (socket) {
        var _this = this;
        if (!socket.getIdentifier()) {
            throw new Error('IncomingDataPipeline#hookSocket: Can only hook sockets with identifier');
        }

        var identifier = socket.getIdentifier();

        if (!this._socketHooks[identifier]) {
            var hook = function (buffer) {
                _this._handleIncomingData(buffer, socket);
            };
            this._socketHooks[identifier] = hook;
            socket.on('data', hook);
        }
    };

    IncomingDataPipeline.prototype.unhookSocket = function (socket) {
        var identifier = socket.getIdentifier();
        if (identifier && this._socketHooks[identifier]) {
            socket.removeListener('data', this._socketHooks[identifier]);
            delete this._socketHooks[identifier];
            return true;
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
        var dataLen = tempMessageMemory.data.length;

        for (var i = 0; i < dataLen; i++) {
            tempMessageMemory.data[i] = null;
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
    * of it and emit the `message` event. If the message is errorous, nothing is done.
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
                this.emit('message', identifier, msg);
            } catch (e) {
            }
        } else if (tempMessageMemory.length > this._maxByteLengthPerMessage) {
            this._freeMemory(identifier, tempMessageMemory);
        }
    };
    return IncomingDataPipeline;
})(events.EventEmitter);

module.exports = IncomingDataPipeline;
//# sourceMappingURL=IncomingDataPipeline.js.map
