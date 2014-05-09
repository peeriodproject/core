/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var GeneralWritableMessageFactory = require('../../../src/core/protocol/messages/GeneralWritableMessageFactory');

var ContactNode = require('../../../src/core/topology/ContactNode');
var Id = require('../../../src/core/topology/Id');
var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

describe('CORE --> PROTOCOL --> MESSAGES --> GeneralWritableMessageFactory', function () {
    var sandbox;
    var sender;
    var receiver;
    var factory;

    var createWorkingMessage = function () {
        var begin = new Buffer([0x50, 0x52, 0x44, 0x42, 0x47, 0x4e]), end = new Buffer([0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]), receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88]), senderId = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9]), ipv4Address = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03]), ipv6Address = new Buffer([0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]), addressEnd = new Buffer([0x05]), messageType = new Buffer([0x50, 0x49]), payload = new Buffer('foobar', 'utf8'), list = [begin, receiverId, senderId, ipv4Address, ipv6Address, addressEnd, messageType, payload, end];

        return Buffer.concat(list);
    };

    before(function () {
        sandbox = sinon.sandbox.create();
        receiver = testUtils.stubPublicApi(sandbox, ContactNode, {
            "getId": function () {
                return new Id(Id.byteBufferByHexString('f3ec6b952992bb07f34862a411bb1f833f636288', 20), 160);
            }
        });

        var addressList = [new ContactNodeAddress('44.123.255.7', 55555), new ContactNodeAddress('2001:db8::ff00:42:8329', 55555)];
        sender = new ContactNode(new Id(Id.byteBufferByHexString('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 20), 160), addressList, 10);

        factory = new GeneralWritableMessageFactory(sender);
    });

    it('should correctly create the message', function () {
        factory.setReceiver(receiver);
        factory.setMessageType('PING');
        var msg = factory.constructMessage(new Buffer('foobar', 'utf8'));
        var msgCheck = createWorkingMessage();

        msg.length.should.equal(msgCheck.length);

        for (var i = 0; i < msg.length; i++) {
            msg[i].should.equal(msgCheck[i]);
        }
    });

    it('should throw an error when not setting a receiver/message type', function () {
        (function () {
            factory.constructMessage(new Buffer(1));
        }).should.throw('GeneralWritableMessageFactory#constructMessage: Sender and receiver must be specified.');
    });

    it('sender has changed should be true', function () {
        factory.setSender(receiver);
        factory.getSenderHasChanged().should.be.true;
    });

    it('should throw an error that the message type is unknown', function () {
        factory.setSender(sender);
        factory.setReceiver(receiver);
        factory.setMessageType('foobar');
        (function () {
            factory.constructMessage(new Buffer([1]), 1);
        }).should.throw('GeneralWritableMessageFactory#constructMessage: Unknown message type.');
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=GeneralWritableMessageFactory.js.map
