/// <reference path='../../test.d.ts' />

require('should');

import ContactNode = require('../../../src/core/topology/ContactNode');
import Id = require('../../../src/core/topology/Id');
import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');
import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNodeListInterface = require('../../../src/core/topology/interfaces/ContactNodeListInterface');
import FoundClosestNodeReadableMessage = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessage');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FoundClosestNodesReadableMessage', function () {

	var nodeFactory = new ContactNodeFactory();
	var addressFactory = new ContactNodeAddressFactory();

	var createWorkingMessage = function ():Buffer {

		// f3ec6b952992bb07f34862a411bb1f833f636288
		var searchForNodeId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88 ]);

		// fe3626caca6c84fa4e5d323b6a26b897582c57f9
		var node1Id = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9 ]);

		// 44.123.255.7:55555 // [2001:0db8:0000:0000:0000:ff00:0042:8329]:55555
		var node1Addresses = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03, 0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03, 0x05]);

		// 043626caca6c84fa4e5d323b6a26b897582c57e7
		var node2Id = new Buffer([0x04, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xe7 ]);

		// 127.123.255.7:55556 // 11.10.255.7:55555
		var node2Addresses = new Buffer([0x04, 127, 123, 255, 7, 0xd9, 0x04, 0x04, 11, 10, 255, 7, 0xd9, 0x03, 0x05]);

		return Buffer.concat([searchForNodeId, node1Id, node1Addresses, node2Id, node2Addresses]);
	};

	var createBadMessage = function ():Buffer {

		// f3ec6b952992bb07f34862a411bb1f833f636288
		var searchForNodeId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88 ]);

		// fe3626caca6c84fa4e5d323b6a26b897582c57f9
		var node1Id = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9 ]);

		// 44.123.255.7:55555 // [2001:0db8:0000:0000:0000:ff00:0042:8329]:55555
		var node1Addresses = new Buffer([0x04, 44, 123, 255, 7, 0xd9, 0x03, 0x06, 0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29, 0xd9, 0x03, 0x05]);

		// 043626caca6c84fa4e5d323b6a26b897582c57e7
		var node2Id = new Buffer([0x04, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xe7 ]);

		// 127.123.255.7:55556 // 11.10.255.7:55555
		var node2Addresses = new Buffer([0x04, 127, 123, 255, 7, 0xd9, 0x04, 0x04, 11, 10, 255, 7, 0xd9, 0x03, 0x05, 0x06]);

		return Buffer.concat([searchForNodeId, node1Id, node1Addresses, node2Id, node2Addresses]);
	};

	it('should correctly deformat a message', function () {
		var msg:FoundClosestNodeReadableMessage = new FoundClosestNodeReadableMessage(createWorkingMessage(), nodeFactory, addressFactory);

		msg.getSearchedForId().toHexString().should.equal('f3ec6b952992bb07f34862a411bb1f833f636288');

		var nodeList = msg.getFoundNodeList();

		msg.discard();

		nodeList[0].getId().toHexString().should.equal('fe3626caca6c84fa4e5d323b6a26b897582c57f9');
		nodeList[0].getAddresses()[0].getIp().should.equal('44.123.255.7');
		nodeList[0].getAddresses()[0].getPort().should.equal(55555);
		nodeList[0].getAddresses()[1].getIp().should.equal('2001:0db8:0000:0000:0000:ff00:0042:8329');
		nodeList[0].getAddresses()[1].getPort().should.equal(55555);
		nodeList[1].getId().toHexString().should.equal('043626caca6c84fa4e5d323b6a26b897582c57e7');
		nodeList[1].getAddresses()[0].getIp().should.equal('127.123.255.7');
		nodeList[1].getAddresses()[0].getPort().should.equal(55556);
		nodeList[1].getAddresses()[1].getIp().should.equal('11.10.255.7');
		nodeList[1].getAddresses()[1].getPort().should.equal(55555);

	});

	it('should throw an error when deformatting a bad message', function () {
		(function () {
			new FoundClosestNodeReadableMessage(createBadMessage(), nodeFactory, addressFactory);
		}).should.throwError();
	});

});