var ContactNodeAddress = require('./ContactNodeAddress');

var ContactNodeAddressFactory = (function () {
    function ContactNodeAddressFactory() {
    }
    ContactNodeAddressFactory.prototype.create = function (ip, port) {
        return new ContactNodeAddress(ip, port);
    };
    return ContactNodeAddressFactory;
})();

module.exports = ContactNodeAddressFactory;
//# sourceMappingURL=ContactNodeAddressFactory.js.map
