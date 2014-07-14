/**
* WritableBlockMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.WritableBlockMessageFactory
* @implements core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface
*/
var WritableBlockMessageFactory = (function () {
    function WritableBlockMessageFactory() {
    }
    WritableBlockMessageFactory.prototype.constructMessage = function (feedingNodesBlock, firstBytePositionOfBlock, nextTransferIdentifier, dataBlock, feedingNodesBlockLen, dataBlockLen) {
        var fullByteLength = (feedingNodesBlockLen || feedingNodesBlock.length) + (dataBlockLen || dataBlock.length) + 24;
        var firstPositionBuffer = new Buffer(8);

        firstPositionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfBlock / 1000), 0);
        firstPositionBuffer.writeUInt32BE(firstBytePositionOfBlock % 1000, 4);

        if (nextTransferIdentifier.length !== 32) {
            throw new Error('WritableBlockMessageFactory: Bad next transfer identifier length. Expected 16 bytes.');
        }

        return Buffer.concat([feedingNodesBlock, firstPositionBuffer, new Buffer(nextTransferIdentifier, 'hex'), dataBlock], fullByteLength);
    };
    return WritableBlockMessageFactory;
})();

module.exports = WritableBlockMessageFactory;
//# sourceMappingURL=WritableBlockMessageFactory.js.map
