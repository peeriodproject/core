var FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
* ReadableShareRequestMessageInterface implementation.
* For more information about how a SHARE_REQUEST message is constituted, see the interface.
*
* @class core.protocol.fileTransfer.share.ReadableShareRequestMessage
* @implements core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface
*
* @param {Buffer} buffer The buffer to construct the message from
*/
var ReadableShareRequestMessage = (function () {
    function ReadableShareRequestMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_dhPayload
        */
        this._dhPayload = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_feedingNodesBlock
        */
        this._feedingNodesBlock = null;
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_fileHash
        */
        this._fileHash = null;
        var feedingNodesReponseObj = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);

        var bytesRead = feedingNodesReponseObj.bytesRead;

        this._feedingNodesBlock = buffer.slice(0, bytesRead);
        this._fileHash = buffer.slice(bytesRead, bytesRead + 20).toString('hex');
        this._dhPayload = buffer.slice(bytesRead + 20);

        if (this._dhPayload.length !== 256) {
            throw new Error('ReadableShareRequestMessage: Diffie-Hellman bad length, expected 256 bytes!');
        }
    }
    ReadableShareRequestMessage.prototype.getDHPayload = function () {
        return this._dhPayload;
    };

    ReadableShareRequestMessage.prototype.getFeedingNodesBlock = function () {
        return this._feedingNodesBlock;
    };

    ReadableShareRequestMessage.prototype.getFileHash = function () {
        return this._fileHash;
    };
    return ReadableShareRequestMessage;
})();

module.exports = ReadableShareRequestMessage;
//# sourceMappingURL=ReadableShareRequestMessage.js.map
