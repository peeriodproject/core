var ReadableEncryptedShareMessage = require('./ReadableEncryptedShareMessage');

/**
* ReadableEncryptedShareMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory
* @implements core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface
*/
var ReadableEncryptedShareMessageFactory = (function () {
    function ReadableEncryptedShareMessageFactory() {
    }
    ReadableEncryptedShareMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableEncryptedShareMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableEncryptedShareMessageFactory;
})();

module.exports = ReadableEncryptedShareMessageFactory;
//# sourceMappingURL=ReadableEncryptedShareMessageFactory.js.map
