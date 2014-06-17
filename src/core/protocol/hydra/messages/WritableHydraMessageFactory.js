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
    WritableHydraMessageFactory.prototype.constructMessage = function (msgType, payload, payloadLength, circuitId) {
        payloadLength = payloadLength ? payloadLength : payload.length;

        var indicatorByte = HydraByteCheatsheet.hydraMessageTypes[msgType];

        if (!indicatorByte) {
            throw new Error('WritableHydraMessageFactory: Unknow message type.');
        }

        var circIdBuf = (circuitId && HydraByteCheatsheet.circuitMessages.indexOf(msgType) > -1) ? new Buffer(circuitId, 'hex') : new Buffer(0);

        return Buffer.concat([new Buffer([indicatorByte]), circIdBuf, payload], payloadLength + 1 + circIdBuf.length);
    };
    return WritableHydraMessageFactory;
})();

module.exports = WritableHydraMessageFactory;
//# sourceMappingURL=WritableHydraMessageFactory.js.map
