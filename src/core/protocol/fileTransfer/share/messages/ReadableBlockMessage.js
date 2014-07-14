var FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
* ReadableBlockMessageInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableBlockMessage
* @implements core.protocol.fileTransfer.share.ReadableBlockMessageInterface
*
* @param {Buffer} buffer The byte buffer to construct the message from.
*/
var ReadableBlockMessage = (function () {
    function ReadableBlockMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockMessage~_dataBlock
        */
        this._dataBlock = null;
        /**
        * @member {number} core.protocol.fileTransfer.share.ReadableBlockMessage~_firstBytePositionOfBlock
        */
        this._firstBytePositionOfBlock = 0;
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableBlockMessage~_nextTransferIdentifier
        */
        this._nextTransferIdentifier = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockMessage~_feedingNodesBlock
        */
        this._feedingNodesBlock = null;
        var feedingNodesBlockObject = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);
        var bytesRead = feedingNodesBlockObject.bytesRead;

        this._feedingNodesBlock = buffer.slice(0, bytesRead);

        this._firstBytePositionOfBlock = buffer.readUInt32BE(bytesRead) * 1000 + buffer.readUInt32BE(bytesRead + 4);
        this._nextTransferIdentifier = buffer.slice(bytesRead + 8, bytesRead + 24).toString('hex');

        if (this._nextTransferIdentifier.length !== 32) {
            throw new Error('ReadableBlockMessage: Next transfer identifier bad length. Expected 16 bytes.');
        }

        this._dataBlock = buffer.slice(bytesRead + 24);
    }
    ReadableBlockMessage.prototype.getDataBlock = function () {
        return this._dataBlock;
    };

    ReadableBlockMessage.prototype.getFeedingNodesBlock = function () {
        return this._feedingNodesBlock;
    };

    ReadableBlockMessage.prototype.getFirstBytePositionOfBlock = function () {
        return this._firstBytePositionOfBlock;
    };

    ReadableBlockMessage.prototype.getNextTransferIdentifier = function () {
        return this._nextTransferIdentifier;
    };
    return ReadableBlockMessage;
})();

module.exports = ReadableBlockMessage;
//# sourceMappingURL=ReadableBlockMessage.js.map
