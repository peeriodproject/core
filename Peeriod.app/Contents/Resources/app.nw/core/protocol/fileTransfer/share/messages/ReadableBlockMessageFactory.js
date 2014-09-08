var ReadableBlockMessage = require('./ReadableBlockMessage');

/**
* @class core.protocol.fileTransfer.share.ReadableBlockMessageFactory
* @implements core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface
*/
var ReadableBlockMessageFactory = (function () {
    function ReadableBlockMessageFactory() {
    }
    ReadableBlockMessageFactory.prototype.create = function (buffer) {
        try  {
            return new ReadableBlockMessage(buffer);
        } catch (e) {
            return null;
        }
    };
    return ReadableBlockMessageFactory;
})();

module.exports = ReadableBlockMessageFactory;
//# sourceMappingURL=ReadableBlockMessageFactory.js.map
