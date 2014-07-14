/**
* WritableShareRatifyMessageFactoryInterface implementation
*
* @class core.protocol.fileTransfer.share.WritableShareRatifyMessageFactory
* @implements core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface
*/
var WritableShareRatifyMessageFactory = (function () {
    function WritableShareRatifyMessageFactory() {
    }
    WritableShareRatifyMessageFactory.prototype.constructPartToEncrypt = function (feedingNodesBlock, filesize, filename, feedingNodesBlockLen) {
        var fullLen = feedingNodesBlockLen || feedingNodesBlock.length;
        var filenameBuffer = new Buffer(filename, 'utf8');
        var filesizeBuffer = new Buffer(8);

        filesizeBuffer.writeUInt32BE(Math.floor(filesize / 1000), 0);
        filesizeBuffer.writeUInt32BE(filesize % 1000, 4);

        fullLen += 8 + filenameBuffer.length;

        return Buffer.concat([feedingNodesBlock, filesizeBuffer, filenameBuffer], fullLen);
    };

    WritableShareRatifyMessageFactory.prototype.constructMessage = function (dhPayload, secretHash, encryptedPart, encryptedPartLen) {
        var fullLen = 276 + (encryptedPartLen || encryptedPart.length);

        return Buffer.concat([dhPayload, secretHash, encryptedPart], fullLen);
    };
    return WritableShareRatifyMessageFactory;
})();

module.exports = WritableShareRatifyMessageFactory;
//# sourceMappingURL=WritableShareRatifyMessageFactory.js.map
