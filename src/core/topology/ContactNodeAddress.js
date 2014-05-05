/**
* @class core.topology.ContactNodeAddress
* @implements core.topology.ContactNodeAddressInterface
*/
var ContactNodeAddress = (function () {
    // todo check if the ip string is a valid ip format and throw an error otherwise
    function ContactNodeAddress(ip, port) {
        /**
        * Holds the ip address
        *
        * @member {string} core.topology.ContactNodeAddress~_ip
        */
        this._ip = '';
        /**
        * Holds the port number
        *
        * @member {number} core.topology.ContactNodeAddress~_number
        */
        this._port = 0;
        this._ip = ip;
        this._port = port;
    }
    ContactNodeAddress.prototype.getIp = function () {
        return this._ip;
    };

    ContactNodeAddress.prototype.getPort = function () {
        return this._port;
    };
    return ContactNodeAddress;
})();

module.exports = ContactNodeAddress;
//# sourceMappingURL=ContactNodeAddress.js.map
