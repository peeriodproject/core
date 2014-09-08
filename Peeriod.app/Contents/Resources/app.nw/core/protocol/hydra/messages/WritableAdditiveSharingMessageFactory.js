var net = require('net');

var ContactNodeAddress = require('../../../topology/ContactNodeAddress');
var MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
* WritableAdditiveSharingMessageFactoryInterface implementation.
*
* @class core.protocol.hydra.WritableAdditiveSharingMessageFactory
* @implements core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface
*/
var WritableAdditiveSharingMessageFactory = (function () {
    function WritableAdditiveSharingMessageFactory() {
    }
    WritableAdditiveSharingMessageFactory.prototype.constructMessage = function (relayToIp, relayToPort, payload, payloadLength) {
        payloadLength = payloadLength ? payloadLength : payload.length;

        var indicatorByte = 0;
        var toAdd = 1;

        if (net.isIPv4(relayToIp)) {
            indicatorByte = MessageByteCheatsheet.ipv4;
            toAdd += 6;
        } else if (net.isIPv6(relayToIp)) {
            indicatorByte = MessageByteCheatsheet.ipv6;
            toAdd += 18;
        } else {
            throw new Error('WritableAdditiveSharingMessageFactory: Unrecognizable IP address');
        }

        var addressBuffer = ContactNodeAddress.ipPortAsBuffer(relayToIp, relayToPort);

        return Buffer.concat([new Buffer([indicatorByte]), addressBuffer, payload], payloadLength + toAdd);
    };
    return WritableAdditiveSharingMessageFactory;
})();

module.exports = WritableAdditiveSharingMessageFactory;
//# sourceMappingURL=WritableAdditiveSharingMessageFactory.js.map
