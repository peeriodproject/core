/// <reference path='../../../ts-definitions/node/node.d.ts' />
var ContactNode = require('./ContactNode');

var ContactNodeAddressFactory = require('./ContactNodeAddressFactory');
var Id = require('./Id');

/**
* The `ContactNodeFactory` creates {@link core.topology.ContactNode} according to the {@link core.topology.ContactNodeInterface}
*
* @class core.topology.ContactNodeFactory
* @implements core.topology.ContactNodeFactoryInterface
*/
var ContactNodeFactory = (function () {
    function ContactNodeFactory() {
    }
    ContactNodeFactory.prototype.create = function (id, addresses, lastSeen) {
        lastSeen = lastSeen || Date.now();
        return new ContactNode(id, addresses, lastSeen);
    };

    ContactNodeFactory.prototype.createFromObject = function (object) {
        var addressFactory = new ContactNodeAddressFactory();
        var addresses = [];

        if (object.addresses && object.addresses.length) {
            for (var i in object.addresses) {
                var address = object.addresses[i];
                addresses.push(addressFactory.create(address._ip, address._port));
            }
        }

        var idBuffer = new Buffer(object.id);
        return this.create(new Id(idBuffer, 160), addresses, object.lastSeen);
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
            var lastSeen = Math.round(Date.now() * Math.random()) + '';

            if (lastSeen.length > 10) {
                lastSeen = lastSeen.substr(0, 9);
            }

            return parseInt(lastSeen, 10);
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
