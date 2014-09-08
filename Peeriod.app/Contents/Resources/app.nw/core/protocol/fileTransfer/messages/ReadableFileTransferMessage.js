var TransferMessageByteCheatsheet = require('./TransferMessageByteCheatsheet');

/**
* ReadableFileTransferMessageInterface implementation.
*
* @class core.protocol.fileTransfer.ReadableFileTransferMessage
* @implements core.protocol.fileTransfer.ReadableFileTransferMessageInterface
*
* @param {Buffer} buffer The byte buffer to construct the message from.
*/
var ReadableFileTransferMessage = (function () {
    function ReadableFileTransferMessage(buffer) {
        /**
        * @member {string} core.protocol.fileTransfer.ReadableFileTransferMessage~_messageType
        */
        this._messageType = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.ReadableFileTransferMessage~_payload
        */
        this._payload = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.ReadableFileTransferMessage~_rawBuffer
        */
        this._rawBuffer = null;
        /**
        * @member {string} core.protocol.fileTransfer.ReadableFileTransferMessage~_transferId
        */
        this._transferId = null;
        if (buffer.length < 17) {
            throw new Error('ReadableFileTransferMessage: Message too short!');
        }

        this._transferId = buffer.slice(0, 16).toString('hex');

        var messageTypes = TransferMessageByteCheatsheet.messageTypes;
        var readableTypes = Object.keys(messageTypes);
        var indicatorByte = buffer[16];

        for (var i = 0, l = readableTypes.length; i < l; i++) {
            var readableType = readableTypes[i];
            if (messageTypes[readableType] === indicatorByte) {
                this._messageType = readableType;
            }
        }

        if (!this._messageType) {
            throw new Error('ReadableFileTransferMessage: Could not recognize message type.');
        }

        this._payload = buffer.slice(17);

        this._rawBuffer = buffer;
    }
    ReadableFileTransferMessage.prototype.getRawBuffer = function () {
        return this._rawBuffer;
    };

    ReadableFileTransferMessage.prototype.getMessageType = function () {
        return this._messageType;
    };

    ReadableFileTransferMessage.prototype.getPayload = function () {
        return this._payload;
    };

    ReadableFileTransferMessage.prototype.getTransferId = function () {
        return this._transferId;
    };
    return ReadableFileTransferMessage;
})();

module.exports = ReadableFileTransferMessage;
//# sourceMappingURL=ReadableFileTransferMessage.js.map
