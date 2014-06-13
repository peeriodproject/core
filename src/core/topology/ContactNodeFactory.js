/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/microtime/microtime.d.ts' />
var microtime = require('microtime');

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
        lastSeen = lastSeen || microtime.now();
        return new ContactNode(id, addresses, lastSeen);
    };

    ContactNodeFactory.prototype.createFromObject = function (object) {
        var addressFactory = new ContactNodeAddressFactory();
        var addresses = [];

        if (object.addresses && object.addresses.length) {
            for (var i = 0, l = object.addresses.length; i < l; i++) {
                var address = object.addresses[i];
                addresses.push(addressFactory.create(address._ip, address._port));
            }
        }

        var idBuffer = new Buffer(object.id);
        return this.create(new Id(idBuffer, 160), addresses, object.lastSeen);
    };

    ContactNodeFactory.createDummy = function (idStr, encoding, ip, port) {
        var getId = function () {
            var getRandomId = function () {
                var str = '';

                for (var i = 160; i--;) {
                    str += (Math.round(Math.random())).toString();
                }

                return str;
            };

            idStr = idStr || getRandomId();

            var method = (encoding && encoding === 'hex') ? 'byteBufferByHexString' : 'byteBufferByBitString';

            return new Id(Id[method](idStr, 20), 160);
        };

        var getAddresses = function () {
            if (!(ip && port)) {
                return [ContactNodeAddressFactory.createDummy()];
            } else {
                return [(new ContactNodeAddressFactory()).create(ip, port)];
            }
        };

        /*var getLastSeen = function ():number {
        return microtime.now();
        };*/
        return new ContactNode(getId(), getAddresses(), ContactNodeFactory.getLastSeen());
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

    ContactNodeFactory.getLastSeen = function () {
        return microtime.now();
    };
    return ContactNodeFactory;
})();

module.exports = ContactNodeFactory;
//# sourceMappingURL=ContactNodeFactory.js.map
