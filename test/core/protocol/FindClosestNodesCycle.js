/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var FindClosestNodesCycle = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesCycle');

var MyNode = require('../../../src/core/topology/MyNode');
var Id = require('../../../src/core/topology/Id');
var ContactNode = require('../../../src/core/topology/ContactNode');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var FindClosestNodesManager = require('../../../src/core/protocol/findClosestNodes/FindClosestNodesManager');
var FoundClosestNodesReadableMessage = require('../../../src/core/protocol/findClosestNodes/messages/FoundClosestNodesReadableMessage');

describe('CORE --> PROTOCOL --> FIND CLOSEST NODES --> FindClosestNodesCycle', function () {
    var sandbox;

    var myNodeBits = '11001101';

    // first search
    var findCycle = null;
    var searchFor = '01101101';
    var searchForHex = '6d';
    var startWith = [
        '01100000',
        '00100100'];

    var responder1 = '00100100';
    var response1 = [
        '01101101',
        '01100000',
        '10101101',
        '11011011',
        '01111111'];

    var resultingList = null;

    // stubs
    var protocolConnectionManagerStub = null;
    var myNodeStub = null;
    var managerStub = null;

    // checkers for testing
    var sentSearchForTo = [];
    var managerListeners = {};

    var createNode = function (bitstring) {
        return testUtils.stubPublicApi(sandbox, ContactNode, {
            getId: function () {
                return new Id(Id.byteBufferByBitString(bitstring, 1), 8);
            }
        });
    };

    var createNodeList = function (array) {
        var ret = [];
        for (var i = 0; i < array.length; i++) {
            ret.push(createNode(array[i]));
        }

        return ret;
    };

    var emitReply = function (identifier, fromBitString, array) {
        var msg = testUtils.stubPublicApi(sandbox, FoundClosestNodesReadableMessage, {
            getFoundNodeList: function () {
                return createNodeList(array);
            }
        });

        if (managerListeners[identifier]) {
            managerListeners[identifier](createNode(fromBitString), msg);
        } else
            throw new Error('no listener bound.');
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            writeMessageTo: function (node, type, buffer) {
                sentSearchForTo.push(node.getId().toBitString());
            }
        });

        myNodeStub = testUtils.stubPublicApi(sandbox, MyNode, {
            getId: function () {
                return new Id(Id.byteBufferByBitString(myNodeBits, 1), 8);
            }
        });

        managerStub = testUtils.stubPublicApi(sandbox, FindClosestNodesManager, {
            getK: function () {
                return 3;
            },
            getAlpha: function () {
                return 3;
            },
            getCycleExpirationMillis: function () {
                return 500;
            },
            getParallelismDelayMillis: function () {
                return 200;
            },
            on: function (identifier, callback) {
                managerListeners[identifier] = callback;
            },
            removeListener: function (identifier) {
                delete managerListeners[identifier];
            }
        });
    });

    it('should correctly instantiate the find cycle', function () {
        findCycle = new FindClosestNodesCycle(myNodeStub, new Id(Id.byteBufferByBitString(searchFor, 1), 8), createNodeList(startWith), managerStub, protocolConnectionManagerStub, function (res) {
            resultingList = res;
        });

        findCycle.should.be.instanceof(FindClosestNodesCycle);
    });

    it('should have probed the starting list', function () {
        sentSearchForTo.length.should.equal(2);
        sentSearchForTo[0].should.equal(startWith[0]);
        sentSearchForTo[1].should.equal(startWith[1]);
        findCycle.getProbeList().length.should.equal(0);
    });

    it('should have set the cycle expiration timeout, but not the alpha timeout', function () {
        findCycle.getCycleTimeout().should.not.equal(0);
        findCycle.getAlphaTimeout().should.equal(0);
    });

    it('should add the node to the confirmed list', function () {
        emitReply('6d', responder1, response1);

        findCycle.getConfirmedList().length.should.equal(1);

        findCycle.getConfirmedList()[0].getId().toBitString().should.equal(responder1);
    });

    it('should have cleared the cycle timeout and set the alpha timeout', function () {
        findCycle.getCycleTimeout().should.equal(0);
        findCycle.getAlphaTimeout().should.not.equal(0);
    });

    it('should have correctly put the received nodes into the right slot in the probe list', function () {
        findCycle.getProbeList().length.should.equal(4);
        findCycle.getProbeList()[0].getId().toBitString().should.equal('01101101');
        findCycle.getProbeList()[1].getId().toBitString().should.equal('01111111');
        findCycle.getProbeList()[2].getId().toBitString().should.equal('11011011');
        findCycle.getProbeList()[3].getId().toBitString().should.equal('10101101');
    });

    it('should probe the next alpha nodes with loose parallelism', function (done) {
        setTimeout(function () {
            if (findCycle.getProbeList().length === 1) {
                setTimeout(function () {
                    if (findCycle.getProbeList().length === 0 && findCycle.getRegisteredIdentifiers().length === 6)
                        done();
                }, 200);
            }
        }, 200);
    });

    it('should correctly finish up the cycle', function () {
        emitReply('6d', '11011011', ['11011111']);
        emitReply('6d', '01101101', []);

        resultingList.length.should.equal(3);
        resultingList[0].getId().toBitString().should.equal('01101101');
        resultingList[1].getId().toBitString().should.equal('00100100');
        resultingList[2].getId().toBitString().should.equal('11011011');

        findCycle.getAlphaTimeout().should.equal(0);
        findCycle.getCycleTimeout().should.equal(0);
        (true).should.equal(managerListeners['6d'] === undefined);
    });

    it('should expire the search cycle', function (done) {
        new FindClosestNodesCycle(myNodeStub, new Id(Id.byteBufferByBitString(searchFor, 1), 8), [], managerStub, protocolConnectionManagerStub, function (res) {
            if (res.length === 1)
                done();
        });

        emitReply('6d', '11011011', ['11001101', '11011011', '11011010', '11011001', '11011111', '00011011', '11000011', '11110011']);
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=FindClosestNodesCycle.js.map
