var ContactNodeAddress = require('./ContactNodeAddress');

var ContactNodeAddressFactory = (function () {
    function ContactNodeAddressFactory() {
    }
    ContactNodeAddressFactory.prototype.create = function (ip, port) {
        return new ContactNodeAddress(ip, port);
    };

    ContactNodeAddressFactory.createDummy = function () {
        var getOctet = function () {
            return Math.round(Math.random() * 255);
        };

        var getRandIp = function () {
            //generate the ipaddress
            return getOctet() + '.' + getOctet() + '.' + getOctet() + '.' + getOctet();
        };

        return new ContactNodeAddress(getRandIp(), Math.round(Math.random() * 100000));
    };
    return ContactNodeAddressFactory;
})();

module.exports = ContactNodeAddressFactory;
//# sourceMappingURL=ContactNodeAddressFactory.js.map
