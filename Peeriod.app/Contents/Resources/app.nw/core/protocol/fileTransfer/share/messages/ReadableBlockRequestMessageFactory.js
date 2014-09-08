var ReadableBlockRequestMessage = require('./ReadableBlockRequestMessage');

/**
* ReadableBlockRequestMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactory
* @interface core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface
*/
var ReadableBlockRequestMessageFactory = (function () {
    function ReadableBlockRequestMessageFactory() {
    }
    ReadableBlockRequestMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableBlockRequestMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableBlockRequestMessageFactory;
})();

module.exports = ReadableBlockRequestMessageFactory;
//# sourceMappingURL=ReadableBlockRequestMessageFactory.js.map
