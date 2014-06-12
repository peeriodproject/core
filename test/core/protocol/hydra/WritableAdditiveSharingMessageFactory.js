/// <reference path='../../../test.d.ts' />
require('should');

var WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> WritableAdditiveSharingMessageFactory', function () {
    var factory = null;

    var compareBuffers = function (a, b) {
        if (a.length !== b.length)
            return false;

        var ret = true;
        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                ret = false;
                break;
            }
        }

        return ret;
    };

    before(function () {
        factory = new WritableAdditiveSharingMessageFactory();
    });

    it('should correctly format the message with ipv6', function () {
        var a = factory.constructMessage('2001:db8::ff00:42:8329', 55555, new Buffer('foobar', 'utf8'));
        var b = Buffer.concat([new Buffer([0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]), new Buffer('foobar', 'utf8')]);

        compareBuffers(a, b).should.be.true;
    });

    it('should correctly format the message with ipv4', function () {
        var a = factory.constructMessage('44.123.255.7', 55555, new Buffer('foobar', 'utf8'));
        var b = Buffer.concat([new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03]), new Buffer('foobar', 'utf8')]);

        compareBuffers(a, b).should.be.true;
    });

    it('should throw an error when the ip is not recognizable', function () {
        (function () {
            factory.constructMessage('foobar', 3333, new Buffer('foobar'));
        }).should.throw();
    });
});
//# sourceMappingURL=WritableAdditiveSharingMessageFactory.js.map
