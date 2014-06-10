var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* WritableHydraMessageFactoryInterface impelementation.
*
* @class core.protocol.hydra.WritableHydraMessageFactory
* @implements core.protocol.hydra.WritableHydraMessageFactoryInterface
*/
var WritableHydraMessageFactory = (function () {
    function WritableHydraMessageFactory() {
    }
    WritableHydraMessageFactory.prototype.constructMessage = function (msgType, payload, payloadLength) {
        payloadLength = payloadLength ? payloadLength : payload.length;

        var indicatorByte = HydraByteCheatsheet.hydraMessageTypes[msgType];

        if (!indicatorByte) {
            throw new Error('WritableHydraMessageFactory: Unknow message type.');
        }

        return Buffer.concat([new Buffer([indicatorByte]), payload], payloadLength + 1);
    };
    return WritableHydraMessageFactory;
})();

module.exports = WritableHydraMessageFactory;
//# sourceMappingURL=WritableHydraMessageFactory.js.map
