var net = require('net');

var MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
* AdditiveSharingMessageInterface implementation.
* Extracts a given buffer.
* For detailed information of the message's parts see the interface.
*
* @class core.potocol.hydra.ReadableAdditiveSharingMessage
* @implements core.potocol.hydra.ReadableAdditiveSharingMessageInterface
*
* @param {Buffer} buffer The buffer to split up into its separate parts.
*/
var ReadableAdditiveSharingMessage = (function () {
    function ReadableAdditiveSharingMessage(buffer) {
        /**
        * The extracted IP address.
        *
        * @member {string} core.protocol.hydra.ReadableAdditiveSharingMessage~_ip
        */
        this._ip = null;
        /**
        * The extracted payload for the CREATE_CELL_ADDITIVE message.
        *
        * @member {Buffer) core.protocol.hydra.ReadableAdditiveSharingMessage~_payload
        */
        this._payload = null;
        /**
        * The extracted port.
        *
        * @member {number} core.protocol.hydra.ReadableAdditiveSharingMessage~_port
        */
        this._port = null;
        var addressIndicator = buffer[0];
        var portFrom = 5;
        var ipError = false;
        var ip = '';

        if (addressIndicator === MessageByteCheatsheet.ipv4) {
            ip = buffer.slice(1, 5).toJSON().join('.');

            if (!net.isIPv4(ip)) {
                ipError = true;
            }
        } else if (addressIndicator == MessageByteCheatsheet.ipv6) {
            for (var i = 0; i < 8; i++) {
                ip += buffer.slice(i * 2 + 1, i * 2 + 3).toString('hex');
                if (i !== 7) {
                    ip += ':';
                }
            }

            if (!net.isIPv6(ip)) {
                ipError = true;
            }

            portFrom = 17;
        } else {
            throw new Error('ReadableAdditiveSharingMessage: Malformed address indicator');
        }

        if (ipError) {
            throw new Error('ReadableAdditiveSharingMessage: Malformed IP');
        }

        this._ip = ip;
        this._port = buffer.readUInt16BE(portFrom);

        this._payload = buffer.slice(portFrom + 2);
    }
    ReadableAdditiveSharingMessage.prototype.getIp = function () {
        return this._ip;
    };

    ReadableAdditiveSharingMessage.prototype.getPayload = function () {
        return this._payload;
    };

    ReadableAdditiveSharingMessage.prototype.getPort = function () {
        return this._port;
    };
    return ReadableAdditiveSharingMessage;
})();

module.exports = ReadableAdditiveSharingMessage;
//# sourceMappingURL=ReadableAdditiveSharingMessage.js.map
