var EncryptedShareMessageByteCheatsheet = require('./EncryptedShareMessageByteCheatsheet');

/**
* ReadableEncryptedShareMessageInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage
* @implements core.protocol.fileTransfer.share.ReadableEcnryptedShareMessageInterface
*
* @param {Buffer} buffer The byte buffer to construct the message from.
*/
var ReadableEncryptedShareMessage = (function () {
    function ReadableEncryptedShareMessage(buffer) {
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage~_messageType
        */
        this._messageType = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage~_payload
        */
        this._payload = null;
        var indicatorByte = buffer[0];

        var messageTypes = EncryptedShareMessageByteCheatsheet.messageTypes;
        var keys = Object.keys(messageTypes);

        for (var i = 0, l = keys.length; i < l; i++) {
            if (messageTypes[keys[i]] === indicatorByte) {
                this._messageType = keys[i];
            }
        }

        if (!this._messageType) {
            throw new Error('ReadableEncryptedShareMessage: Unknown message type');
        }

        this._payload = buffer.slice(1);
    }
    ReadableEncryptedShareMessage.prototype.getMessageType = function () {
        return this._messageType;
    };

    ReadableEncryptedShareMessage.prototype.getPayload = function () {
        return this._payload;
    };
    return ReadableEncryptedShareMessage;
})();

module.exports = ReadableEncryptedShareMessage;
//# sourceMappingURL=ReadableEncryptedShareMessage.js.map
