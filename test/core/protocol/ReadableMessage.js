/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
var ContactNode = require('../../../src/core/topology/ContactNode');
var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

var ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');

describe('CORE --> PROTOCOL --> ReadableMessage', function () {
    var sandbox;
    var addressFactoryStub;
    var nodeFactoryStub;

    var createWorkingMessage = function () {
        var receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88]), senderId = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9]), ipv4Address = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03]), ipv6Address = new Buffer([0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]), addressEnd = new Buffer([0x05]), messageType = new Buffer([0x50, 0x49]), payload = new Buffer('foobar', 'utf8'), list = [receiverId, senderId, ipv4Address, ipv6Address, addressEnd, messageType, payload];

        return Buffer.concat(list);
    };

    var createHydraMessage = function () {
        var receiverId = new Buffer(20), payload = new Buffer('foobar', 'utf8');

        receiverId.fill(0x00);
        var list = [receiverId, payload];
        return Buffer.concat(list);
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        addressFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeAddressFactory, {
            "create": function (ip, port) {
                return testUtils.stubPublicApi(sandbox, ContactNodeAddress, {
                    "getIp": function () {
                        return ip;
                    },
                    "getPort": function () {
                        return port;
                    }
                });
            }
        });

        nodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory, {
            "create": function (id, senderAddresses) {
                return testUtils.stubPublicApi(sandbox, ContactNode, {
                    "getAddresses": function () {
                        return senderAddresses;
                    },
                    "getId": function () {
                        return id;
                    }
                });
            }
        });
    });

    it('stubs should work correctly', function () {
        var addr = addressFactoryStub.create('foo', 10);
        addr.getIp().should.equal('foo');
        addr.getPort().should.equal(10);

        var node = nodeFactoryStub.create('foo', 'bar');
        node.getAddresses().should.equal('bar');
        node.getId().should.equal('foo');
    });

    it('should correctly deformat the message', function () {
        var readable = new ReadableMessage(createWorkingMessage(), nodeFactoryStub, addressFactoryStub);

        // receiver
        readable.getReceiverId().toHexString().should.equal('f3ec6b952992bb07f34862a411bb1f833f636288');

        // sender
        readable.getSender().getId().toHexString().should.equal('fe3626caca6c84fa4e5d323b6a26b897582c57f9');
        var addresses = readable.getSender().getAddresses();
        for (var i = 0; i < addresses.length; i++) {
            var addr = addresses[i];
            addr.getPort().should.equal(55555);
            ['44.123.255.7', '2001:0db8:0000:0000:0000:ff00:0042:8329'].should.containEql(addr.getIp());
        }

        // msgType
        readable.getMessageType().should.equal('PING');

        // payload
        readable.getPayload().toString('utf8').should.equal('foobar');

        readable.isHydra().should.be.false;
    });

    it('should not recognize the message type', function () {
        var msg = createWorkingMessage();
        msg[67] = 0x00;
        (function () {
            new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
        }).should.throw('ReadableMessage~_extractMessageType: Unknown message type.');
    });

    it('should not recognize the IP version', function () {
        var msg = createWorkingMessage();
        msg[66] = 0x00;
        (function () {
            new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
        }).should.throw('ContactNodeAddressExtractor~_extractAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.');
    });

    it('should recognize message as hydra message and return early', function () {
        var msg = new ReadableMessage(createHydraMessage(), nodeFactoryStub, addressFactoryStub);
        msg.isHydra().should.be.true;
        msg.getPayload().toString('utf8').should.equal('foobar');
    });

    afterEach(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=ReadableMessage.js.map
