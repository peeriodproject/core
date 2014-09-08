var ReadableShareRatifyMessage = require('./ReadableShareRatifyMessage');

/**
* ReadableShareRatifyMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactory
* @implements core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface
*/
var ReadableShareRatifyMessageFactory = (function () {
    function ReadableShareRatifyMessageFactory() {
    }
    ReadableShareRatifyMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableShareRatifyMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableShareRatifyMessageFactory;
})();

module.exports = ReadableShareRatifyMessageFactory;
//# sourceMappingURL=ReadableShareRatifyMessageFactory.js.map
