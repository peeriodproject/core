var ReadableCellCreatedRejectedMessage = require('./ReadableCellCreatedRejectedMessage');

/**
* ReadableCellCreatedRejectedMessageFactoryInterface implementation.
*
* @class core.protocol.hydra.ReadableCellCreatedRejectedMessageFactory
* @implements core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface
*/
var ReadableCellCreatedRejectedMessageFactory = (function () {
    function ReadableCellCreatedRejectedMessageFactory() {
    }
    ReadableCellCreatedRejectedMessageFactory.prototype.create = function (buffer) {
        return new ReadableCellCreatedRejectedMessage(buffer);
    };
    return ReadableCellCreatedRejectedMessageFactory;
})();

module.exports = ReadableCellCreatedRejectedMessageFactory;
//# sourceMappingURL=ReadableCellCreatedRejectedMessageFactory.js.map
