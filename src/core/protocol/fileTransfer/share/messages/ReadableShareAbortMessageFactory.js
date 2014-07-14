var ReadableShareAbortMessage = require('./ReadableShareAbortMessage');

/**
* ReadableShareAbortMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory
* @implements core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface
*/
var ReadableShareAbortMessageFactory = (function () {
    function ReadableShareAbortMessageFactory() {
    }
    ReadableShareAbortMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableShareAbortMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableShareAbortMessageFactory;
})();

module.exports = ReadableShareAbortMessageFactory;
//# sourceMappingURL=ReadableShareAbortMessageFactory.js.map
