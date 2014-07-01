var FeedingNodesMessageBlock = require('./FeedingNodesMessageBlock');

/**
* ReadableQueryResponseMessageInterface implementation.
*
* @class core.protocol.fileTransfer.ReadableQueryResponseMessage
* @implements core.protocol.fileTransfer.ReadableQueryResponseMessageInterface
*
* @param {Buffer} buffer The byte buffer to construct the message from.
*/
var ReadableQueryResponseMessage = (function () {
    function ReadableQueryResponseMessage(buffer) {
        /**
        * @member {core.protocol.hydra.HydraNodeList} core.protocol.fileTransfer.ReadableQueryResponseMessageInterface~_feedingNodes
        */
        this._feedingNodes = null;
        /**
        * @member {Buffer} core.protocol.fileTransfer.ReadableQueryResponseMessageInterface~_responseBuffer
        */
        this._responseBuffer = null;
        var res = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);

        this._feedingNodes = res.nodes;
        this._responseBuffer = buffer.slice(res.bytesRead);
    }
    ReadableQueryResponseMessage.prototype.getFeedingNodes = function () {
        return this._feedingNodes;
    };

    ReadableQueryResponseMessage.prototype.getResponseBuffer = function () {
        return this._responseBuffer;
    };
    return ReadableQueryResponseMessage;
})();

module.exports = ReadableQueryResponseMessage;
//# sourceMappingURL=ReadableQueryResponseMessage.js.map
