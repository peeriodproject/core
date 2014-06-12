var ReadableHydraMessage = require('./ReadableHydraMessage');

/**
*
* @class core.protocol.hydra.ReadableHydraMessageFactory
* @implements core.protocol.hydra.ReadableHydraMessageFactoryInterface
*
*/
var ReadableHydraMessageFactory = (function () {
    function ReadableHydraMessageFactory() {
    }
    ReadableHydraMessageFactory.prototype.create = function (buffer) {
        return new ReadableHydraMessage(buffer);
    };
    return ReadableHydraMessageFactory;
})();

module.exports = ReadableHydraMessageFactory;
//# sourceMappingURL=ReadableHydraMessageFactory.js.map
