var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* WritableCreateellAdditiveMessageFactoryInterface implementation.
*
* @class core.protocol.hyra.WritableCreateellAdditiveMessageFactory
* @implements core.protocol.hyra.WritableCreatCellAdditiveMessageFactoryInterface
*/
var WritableCreateCellAdditiveMessageFactory = (function () {
    function WritableCreateCellAdditiveMessageFactory() {
    }
    WritableCreateCellAdditiveMessageFactory.prototype.constructMessage = function (isInitiator, uuid, additivePayload, circuitId) {
        if (additivePayload.length !== 256) {
            throw new Error('WritableCreateCellAdditiveMessageFactory: Additive payload must be of length 256!');
        }

        if (isInitiator && !circuitId) {
            throw new Error('WritableCreateCellAdditiveMessageFactory: Circuit ID required when message is initiator');
        }

        if (circuitId && circuitId.length !== 32) {
            throw new Error('WritableCreateCellAdditiveMessageFactory: Circuit ID must have 16 octets.');
        }

        if (uuid.length !== 32) {
            throw new Error('WritableCreateCellAdditiveMessageFactory: UUID must have 16 octets.');
        }

        var indicatorBuffer = new Buffer([isInitiator ? HydraByteCheatsheet.createCellAdditive.isInitiator : HydraByteCheatsheet.createCellAdditive.notInitiator]);

        var circuitIdBuffer = isInitiator ? new Buffer(circuitId, 'hex') : new Buffer(0);

        var uuidBuffer = new Buffer(uuid, 'hex');

        return Buffer.concat([indicatorBuffer, circuitIdBuffer, uuidBuffer, additivePayload], isInitiator ? 289 : 273);
    };
    return WritableCreateCellAdditiveMessageFactory;
})();

module.exports = WritableCreateCellAdditiveMessageFactory;
//# sourceMappingURL=WritableCreateCellAdditiveMessageFactory.js.map
