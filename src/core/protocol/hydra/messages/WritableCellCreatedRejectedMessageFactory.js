/**
* WritableCellCreatedRejectedMessageFactoryInterface implementation.
*
* @class core.protocol.hydra.WritableCellCreatedRejectedMessageFactory
* @implements core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface
*/
var WritableCellCreatedRejectedMessageFactory = (function () {
    function WritableCellCreatedRejectedMessageFactory() {
    }
    WritableCellCreatedRejectedMessageFactory.prototype.constructMessage = function (uuid, secretHash, dhPayload) {
        if (uuid.length !== 32) {
            throw new Error('WritableCellCreatedRejectedMessageFactory: UUID must be of 16 octets.');
        }

        if (secretHash && !dhPayload) {
            throw new Error('WritableCellCreatedRejectedMessageFactory: Secret hash AND Diffie-Hellman must be present.');
        }

        if (secretHash && secretHash.length !== 20) {
            throw new Error('WritableCellCreatedRejectedMessageFactory: Secret hash must be of SHA-1 hash length.');
        }

        if (dhPayload && dhPayload.length !== 256) {
            throw new Error('WritableCellCreatedRejectedMessageFactory: Diffie-Hellman payload must be of length 256!');
        }

        var uuidBuf = new Buffer(uuid, 'hex');

        return secretHash ? Buffer.concat([uuidBuf, secretHash, dhPayload], 292) : uuidBuf;
    };
    return WritableCellCreatedRejectedMessageFactory;
})();

module.exports = WritableCellCreatedRejectedMessageFactory;
//# sourceMappingURL=WritableCellCreatedRejectedMessageFactory.js.map
