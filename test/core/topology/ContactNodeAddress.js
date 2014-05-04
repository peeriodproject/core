/// <reference path='../../test.d.ts' />
require('should');

var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

describe('CORE --> TOPOLOGY --> ContactNodeAddress @joern', function () {
    it('should return the correct ip', function () {
        var ip = '123.123.123.123';

        new ContactNodeAddress(ip, 80).getIp().should.equal(ip);
    });

    it('should return the correct port', function () {
        var port = 8080;

        new ContactNodeAddress('', port).getPort().should.equal(port);
    });
});
//# sourceMappingURL=ContactNodeAddress.js.map
