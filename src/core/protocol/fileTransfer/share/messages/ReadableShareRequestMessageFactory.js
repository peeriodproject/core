var ReadableShareRequestMessage = require('./ReadableShareRequestMessage');

/**
* ReadableShareRequestMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableShareRequestMessageFactory
* @implements core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface
*/
var ReadableShareRequestMessageFactory = (function () {
    function ReadableShareRequestMessageFactory() {
    }
    ReadableShareRequestMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableShareRequestMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableShareRequestMessageFactory;
})();

module.exports = ReadableShareRequestMessageFactory;
//# sourceMappingURL=ReadableShareRequestMessageFactory.js.map
