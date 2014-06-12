/// <reference path='../../../test.d.ts' />
require('should');

var AdditiveSharingMessage = require('../../../../src/core/protocol/hydra/messages/AdditiveSharingMessage');

describe('CORE --> PROTOCOL --> HYDRA --> AdditiveSharingMessage', function () {
    it('should correctly deformat a message with ipv4', function () {
        // 44.123.255.7:55555
        var ipv4Address = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03]), payload = new Buffer('foobario', 'utf8');

        var m = new AdditiveSharingMessage(Buffer.concat([ipv4Address, payload]));

        m.getIp().should.equal('44.123.255.7');
        m.getPort().should.equal(55555);
        m.getPayload().toString().should.equal('foobario');
    });

    it('should throw an error when deformatting a message with invalid ipv4', function () {
        var ipv4Address = new Buffer('\u0004caf');

        (function () {
            var m = new AdditiveSharingMessage(ipv4Address);
        }).should.throw('AdditiveSharingMessageInterface: Malformed IP');
    });

    it('should correctly deformat a message with ipv6', function () {
        // [2001:0db8:0000:0000:0000:ff00:0042:8329]:55555
        var ipv6Address = new Buffer([0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]), payload = new Buffer('muschi');

        var m = new AdditiveSharingMessage(Buffer.concat([ipv6Address, payload]));

        m.getIp().should.equal('2001:0db8:0000:0000:0000:ff00:0042:8329');
        m.getPort().should.equal(55555);
        m.getPayload().toString().should.equal('muschi');
    });

    it('should throw an error when deformatting a message with invalid ipv6', function () {
        var ipv6Address = new Buffer([0x06, 44, 123, 255, 7, 0xd9, 0x03]);

        (function () {
            var m = new AdditiveSharingMessage(ipv6Address);
        }).should.throw('AdditiveSharingMessageInterface: Malformed IP');
    });

    it('should throw an error when deformatting a message with unknow indicator byte', function () {
        var ipv4Address = new Buffer([0x07, 44, 123, 255, 7, 0xd9, 0x03]), payload = new Buffer('foobario', 'utf8');

        (function () {
            new AdditiveSharingMessage(Buffer.concat([ipv4Address, payload]));
        }).should.throw('AdditiveSharingMessageInterface: Malformed address indicator');
    });
});
//# sourceMappingURL=AdditiveSharingMessage.js.map
