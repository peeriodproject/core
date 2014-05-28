/// <reference path='../../test.d.ts' />

import net = require('net');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import NodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeeker');
import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> NodeSeeker @current', function () {

	var seeker:NodeSeeker = null;

	it('should correctly get and set the factories', function () {
		seeker = new NodeSeeker();
		seeker.setAddressFactory(new ContactNodeAddressFactory());
		seeker.setNodeFactory(new ContactNodeFactory());

		seeker.getAddressFactory().should.be.instanceof(ContactNodeAddressFactory);
		seeker.getNodeFactory().should.be.instanceof(ContactNodeFactory);
	});

	it('should throw an error when creating a node from JSON without addresses', function () {
		var obj = {
			id: '0020000000000000009400010100000050f48602',
			addresses: []
		};

		(function () {
			seeker.nodeFromJSON(obj);
		}).should.throw('NodeSeeker#nodeFromJSON: Addresses may not be empty for a valid node.')
	});

	it('should correctly create a contact node from a valid JSON', function () {
		var obj = {
			id: '0020000000000000009400010100000050f48602',
			addresses: [{
				ip: '127.0.0.1',
				port: 55555
			}]
		};

		var node:ContactNodeInterface = seeker.nodeFromJSON(obj);

		node.should.be.instanceof(ContactNode);
		node.getId().toHexString().should.equal('0020000000000000009400010100000050f48602');
		node.getAddresses()[0].getIp().should.equal('127.0.0.1');
		node.getAddresses()[0].getPort().should.equal(55555);
	});

});