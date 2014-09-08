var FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
* ReadableBlockRequestMessageInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableBlockRequestMessage
* @implements core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface
*
* @param {Buffer} buffer The byte buffer to construct the message from.
*/
var ReadableBlockRequestMessage = (function () {
    function ReadableBlockRequestMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_feedingNodesBlock
        */
        this._feedingNodesBlock = null;
        /**
        * @member {number} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_firstBytePositionOfBlock
        */
        this._firstBytePositionOfBlock = 0;
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_naxtTransferIdentifier
        */
        this._nextTransferIdentifier = null;
        var feedingNodesBlockObject = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);
        var bytesRead = feedingNodesBlockObject.bytesRead;

        this._feedingNodesBlock = buffer.slice(0, bytesRead);

        this._firstBytePositionOfBlock = buffer.readUInt32BE(bytesRead) * 1000 + buffer.readUInt32BE(bytesRead + 4);

        this._nextTransferIdentifier = buffer.slice(bytesRead + 8).toString('hex');
    }
    ReadableBlockRequestMessage.prototype.getFeedingNodesBlock = function () {
        return this._feedingNodesBlock;
    };

    ReadableBlockRequestMessage.prototype.getFirstBytePositionOfBlock = function () {
        return this._firstBytePositionOfBlock;
    };

    ReadableBlockRequestMessage.prototype.getNextTransferIdentifier = function () {
        return this._nextTransferIdentifier;
    };
    return ReadableBlockRequestMessage;
})();

module.exports = ReadableBlockRequestMessage;
//# sourceMappingURL=ReadableBlockRequestMessage.js.map
