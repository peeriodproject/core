/// <reference path='../../test.d.ts' />
require('should');

var FoundClosestNodesReadableMessage = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessage');
var FoundClosestNodesReadableMessageFactory = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FoundClosestNodesReadableMessageFactory', function () {
    var createWorkingMessage = function () {
        // f3ec6b952992bb07f34862a411bb1f833f636288
        var searchForNodeId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88]);

        // fe3626caca6c84fa4e5d323b6a26b897582c57f9
        var node1Id = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9]);

        // 44.123.255.7:55555 // [2001:0db8:0000:0000:0000:ff00:0042:8329]:55555
        var node1Addresses = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03, 0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03, 0x05]);

        // 043626caca6c84fa4e5d323b6a26b897582c57e7
        var node2Id = new Buffer([0x04, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xe7]);

        // 127.123.255.7:55556 // 11.10.255.7:55555
        var node2Addresses = new Buffer([0x04, 127, 123, 255, 7, 0xd9, 0x04, 0x04, 11, 10, 255, 7, 0xd9, 0x03, 0x05]);

        return Buffer.concat([searchForNodeId, node1Id, node1Addresses, node2Id, node2Addresses]);
    };

    it('should return a FoundClosestNodesReadableMessage', function () {
        var a = new FoundClosestNodesReadableMessageFactory();
        a.create(createWorkingMessage()).should.be.instanceof(FoundClosestNodesReadableMessage);
    });
});
//# sourceMappingURL=FoundClosestNodesReadableMessageFactory.js.map
