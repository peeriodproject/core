/// <reference path='../../test.d.ts' />
require('should');

var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

describe('CORE --> TOPOLOGY --> ContactNodeAddress', function () {
    var mockIp = '127.0.0.1';

    var buffersMatch = function (a, b) {
        if (!(a.length === b.length))
            return false;
        for (var i = 0; i < a.length; i++) {
            if (!(a[i] === b[i]))
                return false;
        }
        return true;
    };

    it('should throw an error when constructing with wrong ip', function () {
        var err = 'ContactNodeAddress.constructor: Provided IP is neither of IPv4 nor IPv6 format.';
        (function () {
            new ContactNodeAddress('123456.168.178.44', 80);
        }).should.throw(err);

        (function () {
            new ContactNodeAddress('2001:0DB8:AC10:FE01:::', 80);
        }).should.throw(err);
    });

    it('should return the correct ip', function () {
        new ContactNodeAddress(mockIp, 80).getIp().should.equal(mockIp);
    });

    it('should return the correct port', function () {
        var port = 8080;

        new ContactNodeAddress(mockIp, port).getPort().should.equal(port);
    });

    it('should correctly transform IPv6 to buffer', function () {
        var port = 55555, expected = new Buffer([0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]);

        var ip1 = '2001:0db8:0000:0000:0000:ff00:0042:8329', c1 = new ContactNodeAddress(ip1, port);

        buffersMatch(c1.getAddressAsByteBuffer(), expected).should.be.true;

        var ip2 = '2001:db8::ff00:42:8329', c2 = new ContactNodeAddress(ip2, port);
        buffersMatch(c2.getAddressAsByteBuffer(), expected).should.be.true;

        var ip3 = '::1', c3 = new ContactNodeAddress(ip3, port);

        buffersMatch(c3.getAddressAsByteBuffer(), new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0xd9, 0x03])).should.be.true;
    });

    it('should correctly transform IPv4 to buffer', function () {
        var port = 6666;

        var c1 = new ContactNodeAddress('192.168.178.1', port);
        buffersMatch(c1.getAddressAsByteBuffer(), new Buffer([192, 168, 178, 1, 0x1a, 0x0a])).should.be.true;

        var c2 = new ContactNodeAddress('92.201.79.157', port);
        buffersMatch(c2.getAddressAsByteBuffer(), new Buffer([92, 201, 79, 157, 0x1a, 0x0a])).should.be.true;
    });
});
//# sourceMappingURL=ContactNodeAddress.js.map
