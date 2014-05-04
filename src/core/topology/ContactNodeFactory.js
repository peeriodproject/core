var ContactNode = require('./ContactNode');

var Id = require('./Id');
var ContactNodeAddressFactory = require('./ContactNodeAddressFactory');

var ContactNodeFactory = (function () {
    function ContactNodeFactory() {
    }
    ContactNodeFactory.prototype.create = function (id, addresses) {
        return new ContactNode(id, addresses, Date.now());
    };

    ContactNodeFactory.createDummy = function () {
        var getId = function () {
            var getRandomId = function () {
                var str = '';

                for (var i = 160; i--;) {
                    str += (Math.round(Math.random())).toString();
                }

                return str;
            };

            return new Id(Id.byteBufferByBitString(getRandomId(), 20), 160);
        };

        var getAddresses = function () {
            return [ContactNodeAddressFactory.createDummy()];
        };

        var getLastSeen = function () {
            // node js is too fast for javascripts millis
            return Math.round(Date.now() * Math.random());
        };

        return new ContactNode(getId(), getAddresses(), getLastSeen());
        /*
        toString: function () {
        return JSON.stringify({
        addresses: this.getAddresses(),
        id       : this.getId(),
        lastSeen : this.getLastSeen()
        });
        }
        */
    };
    return ContactNodeFactory;
})();

module.exports = ContactNodeFactory;
//# sourceMappingURL=ContactNodeFactory.js.map
