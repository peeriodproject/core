require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import NodePublisherFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');
import MyNode = require('../../../src/core/topology/MyNode');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');


describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodePublisherFactory', function () {

	var sandbox:SinonSandbox = null;
	var myNode:any = null;
	var config:any = null;

	before(function () {
		sandbox = sinon.sandbox.create();
		myNode = testUtils.stubPublicApi(sandbox, MyNode, {
			getAddresses: function () {
				return [];
			}
		});
		config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what):any {
				if (what === 'app.dataPath') return testUtils.getFixturePath('core/config');
				if (what === 'app.internalDataPath') return testUtils.getFixturePath('core/config');
				if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig') return 'nodeDiscovery.json';
				if (what === 'protocol.nodeDiscovery.republishInSeconds') return 3;
			}
		});
	});

	it('should return a list of node publisher', function (done) {
		var factory = new NodePublisherFactory(config, config, myNode);
		factory.createPublisherList(function (list) {
			if (list.length === 1) done();
		});
	});

	it('should return an empty list when it cannot load the state file', function (done) {
		var cStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what):any {
				if (what === 'app.dataPath') return testUtils.getFixturePath('core/config/foo/');
				if (what === 'app.internalDataPath') return testUtils.getFixturePath('core/config/foo/');
				if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig') return 'nodeDiscovery.json';
				if (what === 'protocol.nodeDiscovery.republishInSeconds') return 3;
			}
		});

		var factory = new NodePublisherFactory(cStub, cStub, myNode);
		factory.createPublisherList(function (list) {
			if (list.length === 0) done();
		});
	});

	after(function () {
		sandbox.restore();
	});

});