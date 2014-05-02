var Id = require('./Id');

var ContactNodeFactory = (function () {
    function ContactNodeFactory() {
    }
    ContactNodeFactory.createDummy = function () {
        // dummy contact node generator
        var max = 48;

        var getRandomId = function () {
            var str = '';

            for (var i = max; i--;) {
                str += (Math.round(Math.random())).toString();
            }

            return str;
        }, id = getRandomId(), lastSeen = Date.now();

        return {
            getId: function () {
                return new Id(Id.byteBufferByBitString(id, 6), max);
            },
            getPublicKey: function () {
                return 'pk-123456';
            },
            getAddresses: function () {
                return "[{ip: '123', port: 80}, {ip: '456', port: 80}]";
            },
            getLastSeen: function () {
                return lastSeen;
            },
            updateLastSeen: function () {
                lastSeen = Date.now();
            }
        };
    };
    return ContactNodeFactory;
})();

module.exports = ContactNodeFactory;
//# sourceMappingURL=ContactNodeFactory.js.map
