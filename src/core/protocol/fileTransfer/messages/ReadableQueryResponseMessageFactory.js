var ReadableQueryResponseMessage = require('./ReadableQueryResponseMessage');

/**
* ReadableQueryResponseMessageFactory implementation.
*
* @class core.protocol.fileTransfer.ReadableQueryResponseMessageFactory
* @implements core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface
*/
var ReadableQueryResponseMessageFactory = (function () {
    function ReadableQueryResponseMessageFactory() {
    }
    ReadableQueryResponseMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableQueryResponseMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableQueryResponseMessageFactory;
})();

module.exports = ReadableQueryResponseMessageFactory;
//# sourceMappingURL=ReadableQueryResponseMessageFactory.js.map
