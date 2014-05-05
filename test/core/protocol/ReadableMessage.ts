/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');
import Id = require('../../../src/core/topology/Id');
import ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');

describe('CORE --> PROTOCOL --> READABLEMESSAGE', function () {
	var sandbox:SinonSandbox;
	var addressFactoryStub:any;
	var nodeFactoryStub:any;

	var createWorkingMessage = function():Buffer {
		var begin = new Buffer([0x50, 0x52, 0x44, 0x42, 0x47, 0x4e]),
			end = new Buffer([0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]),
			// f3ec6b952992bb07f34862a411bb1f833f636288
			receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88 ]),
			// fe3626caca6c84fa4e5d323b6a26b897582c57f9
			senderId = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9 ]),
			// 44.123.255.7:55555
			ipv4Address = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03]),

			// [2001:0db8:0000:0000:0000:ff00:0042:8329]:55555
			ipv6Address = new Buffer([0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03]),
			addressEnd = new Buffer([0x05]),
			// PING
			messageType = new Buffer([0x50, 0x49]),
			// foobar
			payload = new Buffer('foobar', 'utf8'),

			list = [begin, receiverId, senderId, ipv4Address, ipv6Address, addressEnd, messageType, payload, end];

		return Buffer.concat(list);
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();

		addressFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeAddressFactory, {
			"create": function (ip:string, port:number) {
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
			"create": function (id:any, senderAddresses:any) {
				return testUtils.stubPublicApi(sandbox, ContactNode, {
					"getAddresses": function () {
						return senderAddresses;
					},
					"getId": function () {
						return id;
					}
				});
			}
		})
	});

	it ('stubs should work correctly', function () {
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
		for (var i=0; i<addresses.length; i++) {
			var addr = addresses[i];
			addr.getPort().should.equal(55555);
			['44.123.255.7', '2001:0db8:0000:0000:0000:ff00:0042:8329'].should.containEql(addr.getIp());
		}

		// msgType
		readable.getMessageType().should.equal('PING');

		// payload
		readable.getPayload().toString('utf8').should.equal('foobar');

	});

	it('should not recognize it as a protocol message', function () {
		var msg = createWorkingMessage();
		msg[0] = 0x00;
		(function () {
			new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
		}).should.throw('ReadableMessage~_deformat: Buffer is not protocol compliant.')

		msg = createWorkingMessage();
		msg[msg.length - 1] = 0x00;
		(function () {
			new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
		}).should.throw('ReadableMessage~_deformat: Buffer is not protocol compliant.')
	});

	it('should not recognize the message type', function () {
		var msg = createWorkingMessage();
		msg[73] = 0x00;
		(function () {
			new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
		}).should.throw('ReadableMessage~_extractMessageType: Unknown message type.');
	});

	it('should not recognize the IP version', function () {
		var msg = createWorkingMessage();
		msg[72] = 0x00;
		(function () {
			new ReadableMessage(msg, nodeFactoryStub, addressFactoryStub);
		}).should.throw('ReadableMessage~_extractSenderAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.');
	});


	afterEach(function () {
		sandbox.restore();
	});
});