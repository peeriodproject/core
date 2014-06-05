var MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
* FoundClosestNodesWritableMessageFactoryInterface implementation.
*
* @class core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactory
* @implements core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface
*/
var FoundClosestNodesWritableMessageFactory = (function () {
    function FoundClosestNodesWritableMessageFactory() {
    }
    FoundClosestNodesWritableMessageFactory.prototype.constructPayload = function (searchedForId, nodeList) {
        var bufferList = [];
        var bufferLength = 0;

        bufferList.push(searchedForId.getBuffer());
        bufferLength += 20;

        for (var i = 0; i < nodeList.length; i++) {
            var node = nodeList[i];
            var addressBlock = this._getAddressBlockBuffer(node);

            bufferList.push(node.getId().getBuffer());
            bufferLength += 20;

            bufferList.push(addressBlock);
            bufferLength += addressBlock.length;
        }

        return Buffer.concat(bufferList, bufferLength);
    };

    /**
    * Returns the addresses of a node as byte buffer representation.
    * For more information, see the address block specification of
    * {@link core.protocol.messages.ReadableMessageInterface}
    *
    * @method core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactory~_getAddressBlockBuffer
    *
    * @param {core.topology.ContactNodeInterface} node
    * @returns {Buffer} The address block of the node as byte buffer.
    */
    FoundClosestNodesWritableMessageFactory.prototype._getAddressBlockBuffer = function (node) {
        var bufferList = [];
        var addressList = node.getAddresses();

        for (var i = 0; i < addressList.length; i++) {
            var address = addressList[i];
            var indicatorByte = new Buffer(1);
            var addressBuffer = address.getAddressAsByteBuffer();

            if (address.isIPv4()) {
                indicatorByte[0] = MessageByteCheatsheet.ipv4;
            } else if (address.isIPv6()) {
                indicatorByte[0] = MessageByteCheatsheet.ipv6;
            }

            bufferList.push(indicatorByte);
            bufferList.push(addressBuffer);
        }

        bufferList.push(new Buffer([MessageByteCheatsheet.addressEnd]));

        return Buffer.concat(bufferList);
    };
    return FoundClosestNodesWritableMessageFactory;
})();

module.exports = FoundClosestNodesWritableMessageFactory;
//# sourceMappingURL=FoundClosestNodesWritableMessageFactory.js.map
