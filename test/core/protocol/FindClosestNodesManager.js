/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var FindClosestNodesManager = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
var MyNode = require('../../../src/core/topology/MyNode');
var ContactNode = require('../../../src/core/topology/ContactNode');
var FoundClosestNodesReadableMessageFactory = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');
var FoundClosestNodesReadableMessage = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessage');
var FoundClosestNodesWritableMessageFactory = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
var Id = require('../../../src/core/topology/Id');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var FindClosestNodesCycleFactory = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycleFactory');
var ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FindClosestNodesManager', function () {
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

    var searchedForId = null;

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
                searchedForId = searchForId;
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
                return new Id(Id.byteBufferByHexString('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 20), 160);
            }
        });

        cycleFactoryStub = testUtils.stubPublicApi(sandbox, FindClosestNodesCycleFactory, {
            'create': function (a, startList, callback) {
                startWithList = startList;
                callback(a);
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

    it('should emit the right event when a FOUND_CLOSEST_NODES msg rolls in', function (done) {
        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getMessageType: function () {
                return 'FOUND_CLOSEST_NODES';
            }
        });

        manager.once('ffff', function () {
            done();
        });

        gotMessage(msg);
    });

    it('should adjust the searched for id when searching for its own id', function (done) {
        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getMessageType: function () {
                return 'FIND_CLOSEST_NODES';
            },
            getPayload: function () {
                return new Buffer('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'hex');
            },
            getSender: function () {
                return testUtils.stubPublicApi(sandbox, ContactNode, {
                    getId: function () {
                        return new Id(Id.byteBufferByHexString('1e1e', 2), 16);
                    }
                });
            }
        });

        gotMessage(msg);

        process.nextTick(function () {
            if (searchedForId.toHexString() === 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeef')
                done();
        });
    });

    it('should have written out the payload', function () {
        writtenPayload.toString().should.equal('foobar');
    });

    it('should correctly start / perform a cycle and emit when done', function (done) {
        getClosestResult = ['a', 'b', 'c'];

        manager.once('foundClosestNodes', function (id) {
            if (id.toHexString() === '1111') {
                if (startWithList.length === 2 && manager.getPendingCycles().length === 0)
                    done();
            }
        });
        manager.startCycleFor(new Id(Id.byteBufferByHexString('1111', 2), 16));
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=FindClosestNodesManager.js.map
