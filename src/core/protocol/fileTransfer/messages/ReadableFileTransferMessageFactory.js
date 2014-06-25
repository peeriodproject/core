var ReadableFileTransferMessage = require('./ReadableFileTransferMessage');

/**
* @class core.protocol.fileTransfer.ReadableFileTransferMessageFactory
* @implements core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface
*/
var ReadableFileTransferMessageFactory = (function () {
    function ReadableFileTransferMessageFactory() {
    }
    ReadableFileTransferMessageFactory.prototype.create = function (buffer) {
        var msg = null;

        try  {
            msg = new ReadableFileTransferMessage(buffer);
        } catch (e) {
        }

        return msg;
    };
    return ReadableFileTransferMessageFactory;
})();

module.exports = ReadableFileTransferMessageFactory;
//# sourceMappingURL=ReadableFileTransferMessageFactory.js.map
