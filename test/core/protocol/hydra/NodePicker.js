/// <reference path='../../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var NodePicker = require('../../../../src/core/protocol/hydra/NodePicker');
var RoutingTable = require('../../../../src/core/topology/RoutingTable');
var ContactNodeAddress = require('../../../../src/core/topology/ContactNodeAddress');
var ContactNode = require('../../../../src/core/topology/ContactNode');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> HYDRA --> NodePicker', function () {
    var sandbox;

    var randomNodeList = [];
    var i = 0;

    var nodePicker = null;

    var setRandomNode = function (ip) {
        if (ip) {
            randomNodeList.push(testUtils.stubPublicApi(sandbox, ContactNode, {
                getAddresses: function () {
                    return [testUtils.stubPublicApi(sandbox, ContactNodeAddress, {
                            getPort: function () {
                                return 80;
                            },
                            getIp: function () {
                                return ip;
                            }
                        })];
                }
            }));
        } else {
            randomNodeList.push(null);
        }
    };

    var routingTable = null;
    var config = null;

    var createRandomList = function (ips) {
        randomNodeList = [];
        i = 0;
        for (var j = 0, l = ips.length; j < l; j++) {
            setRandomNode(ips[j]);
        }
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'hydra.additiveSharingNodeAmount')
                    return 3;
                if (what === 'hydra.nodePicker.roundThreshold')
                    return 2;
                if (what === 'hydra.nodePicker.waitingTimeInSeconds')
                    return 1;
                if (what === 'hydra.nodePicker.errorThreshold')
                    return 2;
            }
        });

        routingTable = testUtils.stubPublicApi(sandbox, RoutingTable, {
            getRandomContactNode: function (cb) {
                var node = randomNodeList[i];
                i++;
                if (node) {
                    cb(null, node);
                } else {
                    cb(new Error(), null);
                }
            }
        });
    });

    after(function () {
        sandbox.restore();
    });

    it('should correctly instantiate', function () {
        nodePicker = new NodePicker(config, 3, routingTable);

        nodePicker.should.be.instanceof(NodePicker);
        nodePicker.getAdditiveNodeAmount().should.equal(3);
        nodePicker.getThreshold().should.equal(2);
        nodePicker.getErrorThreshold().should.equal(2);
        nodePicker.getWaitingTime().should.equal(1000);
    });

    it('should throw an error when trying to pick additive nodes before relay nodes', function () {
        (function () {
            nodePicker.pickNextAdditiveNodeBatch(null);
        }).should.throw('NodePicker: Picking additive nodes before relay nodes is not allowed!');
    });

    it('should pick three relay nodes', function (done) {
        createRandomList(['a', 'b', 'a', 'c']);

        nodePicker.pickRelayNodeBatch(function (b) {
            if (b[0].ip === 'a' && b[1].ip === 'b' && b[2].ip === 'c')
                done();
        });
    });

    it('should throw an error when picking relay nodes again', function () {
        (function () {
            nodePicker.pickRelayNodeBatch(null);
        }).should.throw('NodePicker: Relay nodes can only be picked once!');
    });

    it('should pick three additive nodes after a wait time', function (done) {
        var now = Date.now();
        createRandomList(['d', 'c', 'e', 'e', 'd', 'f']);

        nodePicker.pickNextAdditiveNodeBatch(function (b) {
            if (b[0].ip === 'd' && b[1].ip === 'e' && b[2].ip === 'f' && Date.now() - now > 1000)
                done();
        });
    });

    it('list check 1', function () {
        var a = nodePicker.getRelayNodes();
        var b = nodePicker.getNodesUsed();

        a[0].ip.should.equal('a');
        a[1].ip.should.equal('b');
        a[2].ip.should.equal('c');
        b[0].ip.should.equal('d');
        b[1].ip.should.equal('e');
        b[2].ip.should.equal('f');
    });

    it('should pick three additive nodes with threshold', function (done) {
        var now = Date.now();

        createRandomList([null, 'd', 'd', 'a', 'e', null, 'f', 'f', 'g']);

        nodePicker.pickNextAdditiveNodeBatch(function (b) {
            if (b[0].ip === 'd' && b[1].ip === 'e' && b[2].ip === 'g' && Date.now() - now > 2000)
                done();
        });
    });

    it('list check 2', function () {
        var b = nodePicker.getNodesUsed();

        b[0].ip.should.equal('d');
        b[1].ip.should.equal('e');
        b[2].ip.should.equal('f');
        b[3].ip.should.equal('d');
        b[4].ip.should.equal('e');
        b[5].ip.should.equal('g');
    });
});
//# sourceMappingURL=NodePicker.js.map
