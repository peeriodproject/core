/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import FindClosestNodesCycleFactory = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycleFactory');
import FindClosestNodesCycle = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycle');
import MyNode = require('../../../src/core/topology/MyNode');
import Id = require('../../../src/core/topology/Id');
import ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
import FindClosestNodesManager = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesManager');


describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FindClosestNodesCycleFactory', function () {

	var sandbox:SinonSandbox = null;

	var myNodeStub:any = null;
	var protoManagerStub:any = null;
	var managerStub:any = null;


	before(function () {
		sandbox = sinon.sandbox.create();

		myNodeStub = testUtils.stubPublicApi(sandbox, MyNode);
		protoManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager);
		managerStub = testUtils.stubPublicApi(sandbox, FindClosestNodesManager);
	});

	it('should create a cycle', function () {
		var factory = new FindClosestNodesCycleFactory(myNodeStub, protoManagerStub);
		factory.setManager(managerStub);

		factory.create(new Id(Id.byteBufferByBitString('11111111', 1), 8), [], function () {}).should.be.instanceof(FindClosestNodesCycle);
	});

	after(function () {
		sandbox.restore();
	});

});