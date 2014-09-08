var EncryptedShareMessageByteCheatsheet = require('./EncryptedShareMessageByteCheatsheet');

/**
* WritableEncryptedShareMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory
* @implements core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface
*/
var WritableEncryptedShareMessageFactory = (function () {
    function WritableEncryptedShareMessageFactory() {
    }
    WritableEncryptedShareMessageFactory.prototype.constructMessage = function (messageType, payload, payloadLen) {
        var indicatorByte = EncryptedShareMessageByteCheatsheet.messageTypes[messageType];
        var fullLength = 1 + (payloadLen || payload.length);

        if (indicatorByte === undefined) {
            throw new Error('WritableEncryptedShareMessageFactory: Unknown message type!');
        }

        return Buffer.concat([new Buffer([indicatorByte]), payload], fullLength);
    };
    return WritableEncryptedShareMessageFactory;
})();

module.exports = WritableEncryptedShareMessageFactory;
//# sourceMappingURL=WritableEncryptedShareMessageFactory.js.map
