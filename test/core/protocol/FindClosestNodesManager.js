/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var FindClosestNodesManager = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
var MyNode = require('../../../src/core/topology/MyNode');
var FoundClosestNodesReadableMessageFactory = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');
var FoundClosestNodesReadableMessage = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessage');
var FoundClosestNodesWritableMessageFactory = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
var Id = require('../../../src/core/topology/Id');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var FindClosestNodesCycleFactory = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycleFactory');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FindClosestNodesManager @current', function () {
    var sandbox = null;

    var manager = null;

    var configStub = null;
    var protocolConnectionManagerStub = null;
    var proxyManagerStub = null;
    var myNodeStub = null;
    var readableMessageFactoryStub = null;
    var writableMessageFactoryStub = null;
    var routingTableStub = null;
    var cycleFactoryStub = null;

    var gotMessage = function (msg) {
        gotMessageListener(msg);
    };
    var gotMessageListener = null;

    var writtenPayload = null;

    var getClosestResult = ['foobar'];

    var startWithList = null;

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'topology.k')
                    return 5;
                if (what === 'topology.alpha')
                    return 2;
                if (what === 'protocol.findClosestNodes.cycleExpirationInSeconds')
                    return 1;
                if (what === 'protocol.findClosestNodes.parallelismDelayInSeconds')
                    return 0.5;
            }
        });

        protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            writeMessageTo: function (to, what, payload) {
                if (what === 'FOUND_CLOSEST_NODES')
                    writtenPayload = payload;
            }
        });

        proxyManagerStub = testUtils.stubPublicApi(sandbox, ProxyManager, {
            on: function (what, listener) {
                if (what === 'message')
                    gotMessageListener = listener;
            }
        });

        routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
            getClosestContactNodes: function (a, b, callback) {
                callback(null, getClosestResult);
            }
        });

        writableMessageFactoryStub = testUtils.stubPublicApi(sandbox, FoundClosestNodesWritableMessageFactory, {
            constructPayload: function (searchForId, anArray) {
                return new Buffer(anArray[0], 'utf8');
            }
        });

        readableMessageFactoryStub = testUtils.stubPublicApi(sandbox, FoundClosestNodesReadableMessageFactory, {
            create: function () {
                return testUtils.stubPublicApi(sandbox, FoundClosestNodesReadableMessage, {
                    getSearchedForId: function () {
                        return new Id(Id.byteBufferByHexString('ffff', 2), 16);
                    }
                });
            }
        });

        myNodeStub = testUtils.stubPublicApi(sandbox, MyNode, {
            getId: function () {
                return new Id(Id.byteBufferByHexString('eeee', 2), 16);
            }
        });

        cycleFactoryStub = testUtils.stubPublicApi(sandbox, FindClosestNodesCycleFactory, {
            'create': function (a, startList, callback) {
                startWithList = startList;
                callback();
            }
        });
    });

    it('should correctly instantiate the manager', function () {
        manager = new FindClosestNodesManager(configStub, configStub, myNodeStub, protocolConnectionManagerStub, proxyManagerStub, routingTableStub, cycleFactoryStub, writableMessageFactoryStub, readableMessageFactoryStub);
        manager.should.be.instanceof(FindClosestNodesManager);
    });

    it('getters should work correctly', function () {
        manager.getAlpha().should.equal(2);
        manager.getK().should.equal(5);
        manager.getCycleExpirationMillis().should.equal(1000);
        manager.getParallelismDelayMillis().should.equal(500);
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=FindClosestNodesManager.js.map
