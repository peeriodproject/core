require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import NodePublisherFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');
import MyNode = require('../../../src/core/topology/MyNode');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');


describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodePublisherFactory', function () {

	var sandbox:SinonSandbox = null;
	var myNode:any = null;
	var appConfig:any = null;

	before(function () {
		sandbox = sinon.sandbox.create();
		myNode = testUtils.stubPublicApi(sandbox, MyNode, {
			getAddresses: function () {
				return [];
			}
		});
		appConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'app.dataPath') return testUtils.getFixturePath('core/config');
			}
		});
	});

	it('should return a list of node publisher', function (done) {
		var factory = new NodePublisherFactory(appConfig, myNode);
		factory.createPublisherList(function (list) {
			if (list.length === 1) done();
		});
	});

	after(function () {
		sandbox.restore();
	});

});