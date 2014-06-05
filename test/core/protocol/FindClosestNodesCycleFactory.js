/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var FindClosestNodesCycleFactory = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycleFactory');
var FindClosestNodesCycle = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycle');
var MyNode = require('../../../src/core/topology/MyNode');
var Id = require('../../../src/core/topology/Id');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var FindClosestNodesManager = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesManager');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FindClosestNodesCycleFactory', function () {
    var sandbox = null;

    var myNodeStub = null;
    var protoManagerStub = null;
    var managerStub = null;

    before(function () {
        sandbox = sinon.sandbox.create();

        myNodeStub = testUtils.stubPublicApi(sandbox, MyNode);
        protoManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager);
        managerStub = testUtils.stubPublicApi(sandbox, FindClosestNodesManager);
    });

    it('should create a cycle', function () {
        var factory = new FindClosestNodesCycleFactory(myNodeStub, protoManagerStub);
        factory.setManager(managerStub);

        factory.create(new Id(Id.byteBufferByBitString('11111111', 1), 8), [], function () {
        }).should.be.instanceof(FindClosestNodesCycle);
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=FindClosestNodesCycleFactory.js.map
