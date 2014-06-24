var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* ReadableHydraMessageInterface implementation.
* For information of how the message is structured, see the interface {@link core.protocol.hydra.ReadableHydraMessageInterface}
*
* @class core.protocol.hydra.ReadableHydraMessage
* @implements core.protocol.hydra.ReadableHydraMessageInterface
*
* @param {Buffer} buffer Input data to deconstruct.
* @param {boolean} noCircuitIdExtranction Optional. If this is true, the circuit ID is not extracted, no matter what type of message.
*/
var ReadableHydraMessage = (function () {
    function ReadableHydraMessage(buffer, noCircuitIdExtraction) {
        if (typeof noCircuitIdExtraction === "undefined") { noCircuitIdExtraction = false; }
        /**
        * @member {string} core.protocol.hydra.ReadableHydraMessage~_circuitId
        */
        this._circuitId = null;
        /**
        * @member {string} core.protocol.hydra.ReadableHydraMessage~_msgType
        */
        this._msgType = null;
        /**
        * @member {Buffer} core.protocol.hydra.ReadableHydraMessage~_payload
        */
        this._payload = null;
        var bufLen = buffer.length;
        var sliceFrom = 1;

        if (!bufLen) {
            throw new Error('ReadableHydraMessage: Unrecognizable hydra message');
        }

        this._extractMessageType(buffer[0]);

        if (!noCircuitIdExtraction && this._isCircuitMessage()) {
            this._circuitId = buffer.slice(sliceFrom, sliceFrom + 16).toString('hex');
            sliceFrom += 16;
        }

        this._payload = buffer.slice(sliceFrom);
    }
    ReadableHydraMessage.prototype.getCircuitId = function () {
        return this._circuitId;
    };

    ReadableHydraMessage.prototype.getMessageType = function () {
        return this._msgType;
    };

    ReadableHydraMessage.prototype.getPayload = function () {
        return this._payload;
    };

    /**
    * @method core.protocol.hydra.ReadableHydraMessage~_extractMessageType
    *
    * @param {number} octet Indicator byte
    */
    ReadableHydraMessage.prototype._extractMessageType = function (octet) {
        var msgTypes = Object.keys(HydraByteCheatsheet.hydraMessageTypes);
        var msgTypeLength = msgTypes.length;

        for (var i = 0; i < msgTypeLength; i++) {
            if (HydraByteCheatsheet.hydraMessageTypes[msgTypes[i]] === octet) {
                this._msgType = msgTypes[i];
            }
        }

        if (!this._msgType) {
            throw new Error('ReadableHydraMessage: Could not find msg type for given input.');
        }
    };

    ReadableHydraMessage.prototype._isCircuitMessage = function () {
        return HydraByteCheatsheet.circuitMessages.indexOf(this.getMessageType()) > -1;
    };
    return ReadableHydraMessage;
})();

module.exports = ReadableHydraMessage;
//# sourceMappingURL=ReadableHydraMessage.js.map
