var ReadableCreateCellAdditiveMessage = require('./ReadableCreateCellAdditiveMessage');

/**
* @class core.protocol.hydra.ReadableCreateCellAdditiveMessageFactory
* @implements core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface
*/
var ReadableCreateCellAdditiveMessageFactory = (function () {
    function ReadableCreateCellAdditiveMessageFactory() {
    }
    ReadableCreateCellAdditiveMessageFactory.prototype.create = function (buffer) {
        return new ReadableCreateCellAdditiveMessage(buffer);
    };
    return ReadableCreateCellAdditiveMessageFactory;
})();

module.exports = ReadableCreateCellAdditiveMessageFactory;
//# sourceMappingURL=ReadableCreateCellAdditiveMessageFactory.js.map
