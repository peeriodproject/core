require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import NodeSeekerFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');
import RoutingTable = require('../../../src/core/topology/RoutingTable');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');


describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodeSeekerFactory', function () {

	var sandbox:SinonSandbox = null;
	var routingTable:any = null;
	var appConfig:any = null;
	var protocolConfig:any = null;

	before(function () {
		sandbox = sinon.sandbox.create();
		routingTable = testUtils.stubPublicApi(sandbox, RoutingTable);
		appConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'app.dataPath') return testUtils.getFixturePath('core/config');
				if (what === 'app.internalDataPath') return testUtils.getFixturePath('core/config');
			}
		});
		protocolConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig') return 'nodeDiscovery.json';
			}
		});
	});

	it('should return a list of node seekers', function (done) {
		var factory = new NodeSeekerFactory(appConfig, protocolConfig, routingTable);
		factory.createSeekerList(function (list) {
			if (list.length === 2) done();
		});
	});

	after(function () {
		sandbox.restore();
	});

});