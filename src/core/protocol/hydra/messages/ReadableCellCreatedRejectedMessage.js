/**
* ReadableCellCreatedRejectMessageInterface implementation.
*
* @class core.protocol.hydra.ReadableCellCreatedRejectedMessage
* @implements core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface
*
* @param {Buffer} buffer The buffer to deformat.
*/
var ReadableCellCreatedRejectedMessage = (function () {
    function ReadableCellCreatedRejectedMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_dhPayload
        */
        this._dhPayload = null;
        /**
        * @member {boolean} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_isRejected
        */
        this._isRejected = false;
        /**
        * @member {Buffer} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_secretHash
        */
        this._secretHash = null;
        /**
        * @member {string) core.protocol.hydra.ReadableCellCreatedRejectedMessage~_uuid
        */
        this._uuid = null;
        if (buffer.length < 16) {
            throw new Error('ReadableCellCreatedRejectedMessage: Message too short!');
        }

        if (buffer.length === 16) {
            this._isRejected = true;
        }

        this._uuid = buffer.slice(0, 16).toString('hex');

        if (!this._isRejected) {
            this._secretHash = buffer.slice(16, 36);
            this._dhPayload = buffer.slice(36);

            if (this._dhPayload.length !== 2048) {
                throw new Error('ReadableCellCreatedRejectedMessage: Diffie-Hellman bad length!');
            }
        }
    }
    ReadableCellCreatedRejectedMessage.prototype.getDHPayload = function () {
        return this._dhPayload;
    };

    ReadableCellCreatedRejectedMessage.prototype.getSecretHash = function () {
        return this._secretHash;
    };

    ReadableCellCreatedRejectedMessage.prototype.getUUID = function () {
        return this._uuid;
    };

    ReadableCellCreatedRejectedMessage.prototype.isRejected = function () {
        return this._isRejected;
    };
    return ReadableCellCreatedRejectedMessage;
})();

module.exports = ReadableCellCreatedRejectedMessage;
//# sourceMappingURL=ReadableCellCreatedRejectedMessage.js.map
