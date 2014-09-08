var TransferMessageByteCheatsheet = require('./TransferMessageByteCheatsheet');

/**
* WritableFileTransferMessageFactoryInterface implementation
*
* @class core.protocol.fileTransfer.WritableFileTransferMessageFactory
* @implements core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface
*/
var WritableFileTransferMessageFactory = (function () {
    function WritableFileTransferMessageFactory() {
    }
    WritableFileTransferMessageFactory.prototype.constructMessage = function (transferId, messageType, payload, payloadLength) {
        payloadLength = payloadLength || payload.length;

        var indicatorByte = TransferMessageByteCheatsheet.messageTypes[messageType];

        if (indicatorByte == undefined) {
            throw new Error('WritableFileTransferMessageFactory: Unknown message type.');
        }

        var transferIdBuffer = new Buffer(transferId, 'hex');

        if (transferIdBuffer.length !== 16) {
            throw new Error('WritableFileTransferMessageFactory: Transfer ID bad length.');
        }

        return Buffer.concat([transferIdBuffer, new Buffer([indicatorByte]), payload], payloadLength + 17);
    };
    return WritableFileTransferMessageFactory;
})();

module.exports = WritableFileTransferMessageFactory;
//# sourceMappingURL=WritableFileTransferMessageFactory.js.map
