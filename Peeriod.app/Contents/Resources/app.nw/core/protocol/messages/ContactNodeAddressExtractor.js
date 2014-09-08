/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var MessageByteCheatsheet = require('./MessageByteCheatsheet');

/**
* Helper class for extracting address blocks from a byte buffer as specified in
* {@link core.protocol.messages.ReadableMessageInterface}
*
* @class core.protocol.message.ContactNodeAddressExtractor
*/
var ContactNodeAddressExtractor = (function () {
    function ContactNodeAddressExtractor() {
    }
    /**
    * Makes a ContactNodeAddress out of a buffer representing an IPv4 address.
    *
    * @method core.protocol.messages.ContactNodeAddressExtractor.contactNodeAddressByIPv4Buffer
    *
    * @todo From node v.0.11.x (and thus node-webkit v.0.9.x) toJSON() will return a json object with {type:'Buffer',
    * data:[<bytes>]} and not just the array with bytes!
    *
    * @param {Buffer} buffer
    * @returns {ContactNodeAddressInterface}
    */
    ContactNodeAddressExtractor.contactNodeAddressByIPv4Buffer = function (buffer, addressFactory) {
        var ip = buffer.slice(0, 4).toJSON().join('.');
        var port = buffer.readUInt16BE(4);

        return addressFactory.create(ip, port);
    };

    /**
    * Makes a ContactNodeAddress out of a buffer representing an IPv6 address.
    *
    * @method core.protocol.messages.ContactNodeAddressExtractor.contactNodeAddressByIPv6Buffer
    *
    * @param {Buffer} buffer
    * @returns {ContactNodeAddressInterface}
    */
    ContactNodeAddressExtractor.contactNodeAddressByIPv6Buffer = function (buffer, addressFactory) {
        var ip = '';
        var port = buffer.readUInt16BE(16);

        for (var i = 0; i < 8; i++) {
            ip += buffer.slice(i * 2, i * 2 + 2).toString('hex');
            if (i !== 7) {
                ip += ':';
            }
        }

        return addressFactory.create(ip, port);
    };

    /**
    * Extract addresses from a buffer and return them in an array
    *
    * @method core.protocol.messages.ContactNodeAddressExtractor#extractSenderAddressesAndBytesReadAsArray
    *
    * @param {Buffer} buffer The buffer to extract from
    * @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory Address factory to create the addresses with
    * @param {number} from The index of bytes to start from
    * @returns {Array} Returns an array with two items: First is the array of addresses, second is the index of the last byte read.
    */
    ContactNodeAddressExtractor.extractAddressesAndBytesReadAsArray = function (buffer, addressFactory, from) {
        var doRead = true;
        var result = [];

        while (doRead) {
            var identByte = buffer[from];

            from++;

            if (identByte === MessageByteCheatsheet.ipv4) {
                var bytesToRead = 6;

                result.push(ContactNodeAddressExtractor.contactNodeAddressByIPv4Buffer(buffer.slice(from, from + bytesToRead), addressFactory));
                from += bytesToRead;
            } else if (identByte === MessageByteCheatsheet.ipv6) {
                var bytesToRead = 18;

                result.push(ContactNodeAddressExtractor.contactNodeAddressByIPv6Buffer(buffer.slice(from, from + bytesToRead), addressFactory));
                from += bytesToRead;
            } else if (identByte === MessageByteCheatsheet.addressEnd) {
                doRead = false;
            } else {
                doRead = false;
                throw new Error('ContactNodeAddressExtractor~_extractAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.');
            }
        }

        return [result, from];
    };
    return ContactNodeAddressExtractor;
})();

module.exports = ContactNodeAddressExtractor;
//# sourceMappingURL=ContactNodeAddressExtractor.js.map
