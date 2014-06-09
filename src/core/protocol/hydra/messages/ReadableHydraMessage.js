var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* ReadableHydraMessageInterface implementation.
* For information of how the message is structured, see the interface {@link core.protocol.hydra.ReadableHydraMessageInterface}
*
* @class core.protocol.hydra.ReadableHydraMessage
* @implements core.protocol.hydra.ReadableHydraMessageInterface
*
* @param {Buffer} buffer Input data to deconstruct.
*/
var ReadableHydraMessage = (function () {
    function ReadableHydraMessage(buffer) {
        /**
        * @member {string} core.protocol.hydra.ReadableHydraMessage~_msgType
        */
        this._msgType = null;
        /**
        * @member {Buffer} core.protocol.hydra.ReadableHydraMessage~_payload
        */
        this._payload = null;
        var bufLen = buffer.length;

        if (!bufLen) {
            throw new Error('ReadableHydraMessage: Unrecognizable hydra message');
        }

        this._extractMessageType(buffer[0]);

        this._payload = new Buffer(bufLen - 1);

        buffer.copy(this._payload, 0, 1);
    }
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
    return ReadableHydraMessage;
})();

module.exports = ReadableHydraMessage;
//# sourceMappingURL=ReadableHydraMessage.js.map
