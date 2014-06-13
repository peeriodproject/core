var ReadableAdditiveSharingMessage = require('./ReadableAdditiveSharingMessage');

/**
* @class core.protocol.hydra.ReadableAdditiveSharingMessageFactory
* @implements core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface
*/
var ReadableAdditiveSharingMessageFactory = (function () {
    function ReadableAdditiveSharingMessageFactory() {
    }
    ReadableAdditiveSharingMessageFactory.prototype.create = function (buffer) {
        return new ReadableAdditiveSharingMessage(buffer);
    };
    return ReadableAdditiveSharingMessageFactory;
})();

module.exports = ReadableAdditiveSharingMessageFactory;
//# sourceMappingURL=ReadableAdditiveSharingMessageFactory.js.map
