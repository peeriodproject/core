var FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
* ReadableShareRatifyMessageInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableShareRatifyMessage
* @implements core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface
*/
var ReadableShareRatifyMessage = (function () {
    function ReadableShareRatifyMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_dhPayload
        */
        this._dhPayload = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_encryptedPart
        */
        this._encryptedPart = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_feedingNodesBlock
        */
        this._feedingNodesBlock = null;
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_filename
        */
        this._filename = null;
        /**
        * @member {number} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_filesize
        */
        this._filesize = 0;
        /**
        * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_secretHash
        */
        this._secretHash = null;
        this._dhPayload = buffer.slice(0, 256);

        if (this._dhPayload.length !== 256) {
            throw new Error('ReadableShareRatifyMessage: Diffie-Hellman bad length! Expected 256 bytes.');
        }

        this._secretHash = buffer.slice(256, 276);

        if (this._secretHash.length !== 20) {
            throw new Error('ReadableShareRatifyMessage: Secret hash bad length! Expected 20 bytes (SHA-1)');
        }

        this._encryptedPart = buffer.slice(276);
    }
    ReadableShareRatifyMessage.prototype.deformatDecryptedPart = function (decryptedBuffer) {
        var feedingNodesBlockObject = FeedingNodesMessageBlock.extractAndDeconstructBlock(decryptedBuffer);
        var bytesRead = feedingNodesBlockObject.bytesRead;

        this._feedingNodesBlock = decryptedBuffer.slice(0, bytesRead);
        this._filesize = decryptedBuffer.readUInt32BE(bytesRead) * 1000 + decryptedBuffer.readUInt32BE(bytesRead + 4);
        this._filename = decryptedBuffer.slice(bytesRead + 8).toString('utf8');
    };

    ReadableShareRatifyMessage.prototype.getDeformattedDecryptedFeedingNodesBlock = function () {
        return this._feedingNodesBlock;
    };

    ReadableShareRatifyMessage.prototype.getDeformattedDecryptedFilename = function () {
        return this._filename;
    };

    ReadableShareRatifyMessage.prototype.getDeformattedDecryptedFileSize = function () {
        return this._filesize;
    };

    ReadableShareRatifyMessage.prototype.getDHPayload = function () {
        return this._dhPayload;
    };

    ReadableShareRatifyMessage.prototype.getEncryptedPart = function () {
        return this._encryptedPart;
    };

    ReadableShareRatifyMessage.prototype.getSecretHash = function () {
        return this._secretHash;
    };
    return ReadableShareRatifyMessage;
})();

module.exports = ReadableShareRatifyMessage;
//# sourceMappingURL=ReadableShareRatifyMessage.js.map
