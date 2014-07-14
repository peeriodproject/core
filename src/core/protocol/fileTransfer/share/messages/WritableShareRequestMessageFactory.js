/**
* WritableShareRequestMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.WritableShareRequestMessageFactory
* @implements core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface
*/
var WritableShareRequestMessageFactory = (function () {
    function WritableShareRequestMessageFactory() {
    }
    WritableShareRequestMessageFactory.prototype.constructMessage = function (feedingNodesBlock, fileHash, dhPayload, feedingNodesBlockLength) {
        var fullLength = 276 + (feedingNodesBlockLength || feedingNodesBlock.length);

        return Buffer.concat([feedingNodesBlock, new Buffer(fileHash, 'hex'), dhPayload], fullLength);
    };
    return WritableShareRequestMessageFactory;
})();

module.exports = WritableShareRequestMessageFactory;
//# sourceMappingURL=WritableShareRequestMessageFactory.js.map
