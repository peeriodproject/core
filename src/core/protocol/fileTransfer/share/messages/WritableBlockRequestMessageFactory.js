/**
* WritableBlockRequestMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.WritableBlockRequestMessageFactory
* @implements core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface
*/
var WritableBlockRequestMessageFactory = (function () {
    function WritableBlockRequestMessageFactory() {
    }
    WritableBlockRequestMessageFactory.prototype.constructMessage = function (feedingNodesBlock, firstBytePositionOfNextBlock, nextTransferIdentifier, feedingNodesBlockLen) {
        if (nextTransferIdentifier.length !== 32) {
            throw new Error('WritableBlockRequestMessageFactory: Transfer identifier bad length. Expected 16 bytes in hexadecimal string representation.');
        }

        var fullLen = (feedingNodesBlockLen || feedingNodesBlock.length) + 24;

        var positionBuffer = new Buffer(8);

        positionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfNextBlock / 1000), 0);
        positionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfNextBlock % 1000), 4);

        return Buffer.concat([feedingNodesBlock, positionBuffer, new Buffer(nextTransferIdentifier, 'hex')], fullLen);
    };
    return WritableBlockRequestMessageFactory;
})();

module.exports = WritableBlockRequestMessageFactory;
//# sourceMappingURL=WritableBlockRequestMessageFactory.js.map
