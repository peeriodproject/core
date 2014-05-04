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
        // dummy contact node generator
        var max = 160;

        var getRandomId = function () {
            var str = '';

            for (var i = max; i--;) {
                str += (Math.round(Math.random())).toString();
            }

            return str;
        };
        var id = getRandomId();

        // node js is too fast for javascripts millis
        var lastSeen = Math.round(Date.now() * Math.random());

        return {
            getId: function () {
                return new Id(Id.byteBufferByBitString(id, 20), max);
            },
            getAddresses: function () {
                return [ContactNodeAddressFactory.createDummy()];
            },
            getLastSeen: function () {
                return lastSeen;
            },
            updateLastSeen: function () {
                lastSeen = Date.now();
            },
            toString: function () {
                return JSON.stringify({
                    addresses: this.getAddresses(),
                    id: this.getId(),
                    lastSeen: this.getLastSeen(),
                    publicKey: this.getPublicKey()
                });
            }
        };
    };
    return ContactNodeFactory;
})();

module.exports = ContactNodeFactory;
//# sourceMappingURL=ContactNodeFactory.js.map
