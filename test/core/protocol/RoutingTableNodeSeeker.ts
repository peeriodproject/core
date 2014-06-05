/// <reference path='../../test.d.ts' />

import net = require('net');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import RoutingTableNodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/RoutingTableNodeSeeker');
import RoutingTable = require('../../../src/core/topology/RoutingTable');
import ContactNode = require('../../../src/core/topology/ContactNode');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> RoutingTableNodeSeeker', function () {

	var sandbox:SinonSandbox = null;
	var routingTableStub:any = null;

	var returnError:boolean = false;

	before(function () {
		sandbox = sinon.sandbox.create();

		routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
			getRandomContactNode: function (callback) {
				if (returnError) {
					callback(new Error(), null);
				}
				else {
					callback(null, testUtils.stubPublicApi(sandbox, ContactNode));
				}
			}
		});
	});

	it('should return a contact node', function (done) {
		(new RoutingTableNodeSeeker(routingTableStub)).seek(function (node) {
			if (node) done();
		});
	});

	it('should return null on error', function (done) {
		returnError = true;
		(new RoutingTableNodeSeeker(routingTableStub)).seek(function (node) {
			if (node === null) done();
		});
	});

	after(function () {
		sandbox.restore();
	});

});