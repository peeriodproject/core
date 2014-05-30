/// <reference path='../../test.d.ts' />
var events = require('events');
var crypto = require('crypto');

require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var NodeSeekerManager = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerManager');

var ContactNode = require('../../../src/core/topology/ContactNode');

var NetworkMaintainer = require('../../../src/core/protocol/networkMaintenance/NetworkMaintainer');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var MyNode = require('../../../src/core/topology/MyNode');

var Id = require('../../../src/core/topology/Id');

describe('CORE --> PROTOCOL --> NETWORK MAINTENANCE --> NetworkMaintainer @current', function () {
    var sandbox = null;

    var maintainer = null;

    var myNodeIdAsString = '0020000000000060009400010100000050f40602';
    var myNodeIdToSearchForString = '0020000000000060009400010100000050f40603';
    var myNodeId = new Id(Id.byteBufferByHexString(myNodeIdAsString, 20), 160);

    var config = null;
    var myNode = null;
    var findClosestNodesManager = null;
    var proxyManager = null;
    var nodeSeekerManager = null;

    var forceFindNode = null;

    // checkers
    var idsSearchedFor = [];
    var joined = false;

    var createNode = function () {
        var buf = crypto.pseudoRandomBytes(20);
        var id = new Id(buf, 160);
        return testUtils.stubPublicApi(sandbox, ContactNode, {
            getId: function () {
                return id;
            }
        });
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        myNode = testUtils.stubPublicApi(sandbox, MyNode, {
            getId: function () {
                return myNodeId;
            }
        });

        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'protocol.networkMaintenance.bucketRefreshRateInSeconds')
                    return 1;
                if (what === 'topology.bitLength')
                    return 160;
            }
        });

        findClosestNodesManager = new events.EventEmitter();
        findClosestNodesManager.startCycleFor = function (id) {
            idsSearchedFor.push(id);
        };

        proxyManager = new events.EventEmitter();

        nodeSeekerManager = testUtils.stubPublicApi(sandbox, NodeSeekerManager, {
            forceFindActiveNode: function (avoidNode, cb) {
                cb(forceFindNode);
            }
        });
    });

    after(function () {
        sandbox.restore();
    });

    it('should correctly initialize the network maintainer', function () {
        maintainer = new NetworkMaintainer(config, config, myNode, nodeSeekerManager, findClosestNodesManager, proxyManager);

        maintainer.should.be.instanceof(NetworkMaintainer);
        maintainer.getMyIdToSearchFor().toHexString().should.equal(myNodeIdToSearchForString);
        maintainer.getJoinedNetwork().should.be.false;

        maintainer.once('joinedNetwork', function () {
            joined = true;
        });
    });

    it('should prepopulate the buckets with timeouts', function () {
        forceFindNode = createNode();
        maintainer.joinNetwork();

        for (var i = 0; i < maintainer.getBucketRefreshes().length; i++) {
            maintainer.getBucketRefreshes()[i].should.be.instanceof(Object);
        }

        maintainer.getJoinedNetwork().should.be.true;
    });

    it('should correctly set a bucket as accessed', function (done) {
        var node = createNode();
        node.getId().set(158, myNodeId.at(158) ^ 1);
        var index = node.getId().differsInHighestBit(myNodeId);
        var oldTimer = maintainer.getBucketRefreshes()[index];

        proxyManager.emit('contactNodeInformation', node);

        setImmediate(function () {
            if (oldTimer !== maintainer.getBucketRefreshes()[index] && maintainer.getNearestAccessedBucket() === index)
                done();
        });
    });

    it('should have started a cycle for the id close to my node id', function () {
        idsSearchedFor.length.should.equal(1);
        idsSearchedFor[0].toHexString().should.equal(myNodeIdToSearchForString);
    });

    it('should repeat the process when the query results in no additional nodes', function (done) {
        forceFindNode = createNode();

        findClosestNodesManager.emit('foundClosestNodes', null, []);

        setTimeout(function () {
            if (idsSearchedFor.length === 2)
                done();
        }, 10);
    });

    it('should emit initialContactQueryCompleted exactly once', function (done) {
        idsSearchedFor = [];

        maintainer.once('initialContactQueryCompleted', function () {
            maintainer.once('initialContactQueryCompleted', function () {
                throw new Error('should not emit twice');
            });

            done();
        });

        findClosestNodesManager.emit('foundClosestNodes', null, [createNode(), createNode()]);
    });

    it('should query all buckets further away from the nearest neighbor', function () {
        var nearestBucket = maintainer.getNearestAccessedBucket();

        for (var i = nearestBucket + 1; i < 160; i++) {
            idsSearchedFor[i - nearestBucket - 1].differsInHighestBit(myNodeId).should.equal(i);
        }
    });

    it('should finally emit joinedNetwork and unbind the listener', function (done) {
        if (!joined) {
            maintainer.once('joinedNetwork', function () {
                if (findClosestNodesManager.listeners('foundClosestNodes').length === 0)
                    done();
            });

            for (var i = 0; i < idsSearchedFor.length; i++) {
                (function (j) {
                    process.nextTick(function () {
                        findClosestNodesManager.emit('foundClosestNodes', idsSearchedFor[j], [createNode()]);
                    });
                })(i);
            }
        } else {
            if (findClosestNodesManager.listeners('foundClosestNodes').length === 0)
                done();
        }
    });

    it('should refresh all buckets except 2 (or 1 if equal indexes)', function (done) {
        var node1 = createNode();
        var index1 = node1.getId().differsInHighestBit(myNodeId);
        var node2 = createNode();
        var index2 = node2.getId().differsInHighestBit(myNodeId);

        var subtract = index1 === index2 ? 1 : 2;

        var list = [];

        maintainer.on('refreshingBucket', function (index) {
            list.push(index);
        });

        setTimeout(function () {
            proxyManager.emit('contactNodeInformation', node1);
            proxyManager.emit('contactNodeInformation', node2);
        }, 500);

        setTimeout(function () {
            if (list.length === (160 - subtract) && list.indexOf(index1) === -1 && list.indexOf(index2) === -1)
                done();
        }, 1000);
    });
});
//# sourceMappingURL=NetworkMaintainer.js.map
