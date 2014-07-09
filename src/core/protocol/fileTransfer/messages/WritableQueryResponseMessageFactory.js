var FeedingNodesMessageBlock = require('./FeedingNodesMessageBlock');

/**
* WritableQueryResponseMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.WritableQueryResponseMessageFactory
* @implements core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface
*/
var WritableQueryResponseMessageFactory = (function () {
    function WritableQueryResponseMessageFactory() {
    }
    WritableQueryResponseMessageFactory.prototype.constructMessage = function (feedingNodes, responseBuffer) {
        return Buffer.concat([FeedingNodesMessageBlock.constructBlock(feedingNodes), responseBuffer]);
    };
    return WritableQueryResponseMessageFactory;
})();

module.exports = WritableQueryResponseMessageFactory;
//# sourceMappingURL=WritableQueryResponseMessageFactory.js.map
