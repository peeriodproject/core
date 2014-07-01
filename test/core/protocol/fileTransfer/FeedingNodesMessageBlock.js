/// <reference path='../../../test.d.ts' />
require('should');

var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> FeedingNodesMessageBlock', function () {
    it('should correctly format and deformat the message', function () {
        var nodes = [
            {
                ip: '45.123.178.1',
                port: 97,
                feedingIdentifier: 'f681d5b9cfc102b49a11e08f1c02acb4'
            },
            {
                ip: '2001:db8::ff00:42:8329',
                port: 444,
                feedingIdentifier: '7256e3d64d2e9345cc2f2617feecc565'
            }
        ];

        var buf = FeedingNodesMessageBlock.constructBlock(nodes);

        var res = FeedingNodesMessageBlock.extractAndDeconstructBlock(buf);

        res.bytesRead.should.equal(buf.length);

        res.nodes[0].ip.should.equal('45.123.178.1');
        res.nodes[0].port.should.equal(97);
        res.nodes[0].feedingIdentifier.should.equal('f681d5b9cfc102b49a11e08f1c02acb4');

        res.nodes[1].ip.should.equal('2001:0db8:0000:0000:0000:ff00:0042:8329');
        res.nodes[1].port.should.equal(444);
        res.nodes[1].feedingIdentifier.should.equal('7256e3d64d2e9345cc2f2617feecc565');
    });

    it('should error out on different occasions', function () {
        var nodes = [{
                ip: 'foo'
            }];

        (function () {
            FeedingNodesMessageBlock.constructBlock(nodes);
        }).should.throw('FeedingNodesMessageBlock.constructBlock: A node must have IP, port and feedingIdentifier specified!');

        nodes = [{
                ip: '1.1.1.1',
                port: 80,
                feedingIdentifier: 'cafebabecafebabecafebabecafeba'
            }];

        (function () {
            FeedingNodesMessageBlock.constructBlock(nodes);
        }).should.throw('FeedingNodesMessageBlock.constructBlock: feedingIdentifier must be of byte length 16');

        nodes = [{
                ip: 'muschi',
                port: 80,
                feedingIdentifier: 'cafebabecafebabecafebabecafebabe'
            }];

        (function () {
            FeedingNodesMessageBlock.constructBlock(nodes);
        }).should.throw('FeedingNodesMessageBlock.constructBlock: Unrecognizable IP address');

        nodes = [
            {
                ip: '45.123.178.1',
                port: 97,
                feedingIdentifier: 'f681d5b9cfc102b49a11e08f1c02acb4'
            },
            {
                ip: '2001:db8::ff00:42:8329',
                port: 444,
                feedingIdentifier: '7256e3d64d2e9345cc2f2617feecc565'
            }
        ];

        var buf = FeedingNodesMessageBlock.constructBlock(nodes);

        buf[0] = 0xff;

        (function () {
            FeedingNodesMessageBlock.extractAndDeconstructBlock(buf);
        }).should.throw();

        buf[0] = 2;
        buf[17] = 0xff;

        (function () {
            FeedingNodesMessageBlock.extractAndDeconstructBlock(buf);
        }).should.throw('FeedingNodesMessageBlock.extractAndDeconstructBlock: Malformed address indicator.');
    });
});
//# sourceMappingURL=FeedingNodesMessageBlock.js.map
