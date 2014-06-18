var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* ReadableCreateCellAdditiveMessageInterface implementation.
*
* @class core.protocol.hydra.ReadableCreateCellAdditiveMessage
* @implements core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface
*
* @param {Buffer} buffer The buffer to construct the message from.
*/
var ReadableCreateCellAdditiveMessage = (function () {
    function ReadableCreateCellAdditiveMessage(buffer) {
        /**
        * @member {Buffer} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_additivePayload
        */
        this._additivePayload = null;
        /**
        * @member {string} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_circuitId
        */
        this._circuitId = null;
        /**
        * @member {boolean} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_isInitiator
        */
        this._isInitiator = false;
        /**
        * @member {string} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_uuid
        */
        this._uuid = null;
        var indicatorByte = buffer[0];
        var continueAt = 1;

        if (indicatorByte === HydraByteCheatsheet.createCellAdditive.isInitiator) {
            this._isInitiator = true;
            this._circuitId = buffer.slice(1, 17).toString('hex');
            continueAt = 17;
        } else if (indicatorByte !== HydraByteCheatsheet.createCellAdditive.notInitiator) {
            throw new Error('CreateCellAdditiveMessage: Unknow indicator byte.');
        }

        this._uuid = buffer.slice(continueAt, continueAt + 16).toString('hex');

        this._additivePayload = buffer.slice(continueAt + 16);

        if (this._additivePayload.length !== 256) {
            throw new Error('CreateCellAdditiveMessage: Additive payload bad length error.');
        }
    }
    ReadableCreateCellAdditiveMessage.prototype.isInitiator = function () {
        return this._isInitiator;
    };

    ReadableCreateCellAdditiveMessage.prototype.getCircuitId = function () {
        return this._circuitId;
    };

    ReadableCreateCellAdditiveMessage.prototype.getUUID = function () {
        return this._uuid;
    };

    ReadableCreateCellAdditiveMessage.prototype.getAdditivePayload = function () {
        return this._additivePayload;
    };
    return ReadableCreateCellAdditiveMessage;
})();

module.exports = ReadableCreateCellAdditiveMessage;
//# sourceMappingURL=ReadableCreateCellAdditiveMessage.js.map
