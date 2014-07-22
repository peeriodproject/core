/// <reference path='../../test.d.ts' />
var events = require('events');

require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');

var MyNode = require('../../../src/core/topology/MyNode');
var Id = require('../../../src/core/topology/Id');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var ContactNode = require('../../../src/core/topology/ContactNode');
var ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');
var BroadcastManager = require('../../../src/core/protocol/broadcast/BroadcastManager');
var BroadcastReadableMessageFactory = require('../../../src/core/protocol/broadcast/messages/BroadcastReadableMessageFactory');
var BroadcastReadableMessage = require('../../../src/core/protocol/broadcast/messages/BroadcastReadableMessage');
var BroadcastWritableMessageFactory = require('../../../src/core/protocol/broadcast/messages/BroadcastWritableMessageFactory');

describe('CORE --> PROTOCOL --> BROADCAST --> BroadcastManager', function () {
    var sandbox = null;

    var myId = '01010101';

    var broadcastManager = null;

    // CHECKERS
    var writtenMessage = null;
    var writtenTo = [];

    var currentBroadcastId = null;
    var currentTimestamp = null;

    // STUBS
    var configStub = null;
    var proxyManager = null;
    var protocolConnectionManagerStub = null;
    var myNodeStub = null;
    var routingTableStub = null;
    var readableFactoryStub = null;
    var writableFactoryStub = null;

    // HELPER FUNCTIONS
    var emitMessage = function (fromId, broadcastId, timestamp) {
        currentBroadcastId = broadcastId;
        currentTimestamp = timestamp;

        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getMessageType: function () {
                return 'BROADCAST_QUERY';
            },
            getPayload: function () {
                return new Buffer('foobar');
            },
            getSender: function () {
                return testUtils.stubPublicApi(sandbox, ContactNode, {
                    getId: function () {
                        return new Id(Id.byteBufferByBitString(fromId, 1), 8);
                    }
                });
            }
        });

        proxyManager.emit('message', msg);
    };

    var checkIfSentToAllNodesFromIndex = function (index) {
        var checks = [];
        for (var i = 0; i <= index; i++) {
            checks[i] = 0;
        }

        var myId = myNodeStub.getId();

        for (var j = 0; j < writtenTo.length; j++) {
            var b = writtenTo[j].differsInHighestBit(myId);
            checks[b]++;
        }

        var ret = true;
        for (var i = 0; i <= index; i++) {
            if (i == 0) {
                if (checks[0] !== 1) {
                    ret = false;
                }
            } else if (checks[i] !== 2) {
                ret = false;
            }

            if (!ret)
                break;
        }

        writtenTo = [];

        return ret;
    };

    it('should correctly initialize the broadcast manager', function () {
        broadcastManager = new BroadcastManager(configStub, configStub, myNodeStub, protocolConnectionManagerStub, proxyManager, routingTableStub, readableFactoryStub, writableFactoryStub);

        broadcastManager.should.be.instanceof(BroadcastManager);
    });

    it('should correctly intialize a broadcast', function (done) {
        broadcastManager.initBroadcast('BROADCAST_QUERY', new Buffer('muschi'));
        broadcastManager.getKnownBroadcastIds().length.should.equal(1);

        setImmediate(function () {
            writtenTo.length.should.equal(15);
            writtenMessage.toString().should.equal('muschi');
            checkIfSentToAllNodesFromIndex(7).should.be.true;

            done();
        });
    });

    it('should timeout remove the broadcast id', function (done) {
        setTimeout(function () {
            broadcastManager.getKnownBroadcastIds().length.should.equal(0);
            done();
        }, 1000);
    });

    it('should propagate on a broadcast message', function (done) {
        broadcastManager.once('BROADCAST_QUERY', function () {
            setImmediate(function () {
                writtenMessage.toString().should.equal('foobar');
                checkIfSentToAllNodesFromIndex(3).should.be.true;
            });

            done();
        });

        emitMessage('01001111', 'broadcastId1', Date.now());
    });

    it('should do nothing when the broadcast is known', function (done) {
        broadcastManager.once('BROADCAST_QUERY', function () {
            throw new Error('Should not emit BROADCAST_QUERY');
        });

        emitMessage('01101011', 'broadcastId1', Date.now());

        setTimeout(function () {
            broadcastManager.removeAllListeners('BROADCAST_QUERY');
            done();
        }, 10);
    });

    it('should do nothing when the broadcast is ignored', function (done) {
        broadcastManager.once('BROADCAST_QUERY', function () {
            throw new Error('Should not emit BROADCAST_QUERY');
        });

        broadcastManager.ignoreBroadcastId('broadcastId1_ignore');

        emitMessage('01101011', 'broadcastId1_ignore', Date.now());

        setTimeout(function () {
            broadcastManager.removeAllListeners('BROADCAST_QUERY');
            done();
        }, 10);
    });

    it('should do nothing when the broadcast is too old', function (done) {
        broadcastManager.once('BROADCAST_QUERY', function () {
            throw new Error('Should not emit BROADCAST_QUERY');
        });

        emitMessage('01101011', 'broadcastId2', Date.now() - 1000);

        setTimeout(function () {
            broadcastManager.removeAllListeners('BROADCAST_QUERY');
            done();
        }, 10);
    });

    it('should add the broadcast with a modified timestamp', function (done) {
        broadcastManager.once('BROADCAST_QUERY', function () {
            setImmediate(function () {
                broadcastManager.getKnownBroadcastIds()[1].should.equal('broadcastId2');
                checkIfSentToAllNodesFromIndex(6).should.be.true;

                setTimeout(function () {
                    broadcastManager.getKnownBroadcastIds().length.should.equal(1);
                    broadcastManager.getKnownBroadcastIds()[0].should.equal('broadcastId1');
                    done();
                }, 400);
            });
        });

        emitMessage('10000000', 'broadcastId2', Date.now() - 700);
    });

    it('should finally clear the last known broadcast id', function (done) {
        setTimeout(function () {
            broadcastManager.getKnownBroadcastIds().length.should.equal(0);
            done();
        }, 500);
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'topology.bitLength')
                    return 8;
                if (what === 'topology.alpha')
                    return 2;
                if (what === 'protocol.broadcast.broadcastLifetimeInSeconds')
                    return 1;
            }
        });

        proxyManager = new events.EventEmitter();

        protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            writeMessageTo: function (to, type, message) {
                writtenMessage = message;
                writtenTo.push(to.getId());
            }
        });

        myNodeStub = testUtils.stubPublicApi(sandbox, MyNode, {
            getId: function () {
                return new Id(Id.byteBufferByBitString(myId, 1), 8);
            }
        });

        readableFactoryStub = testUtils.stubPublicApi(sandbox, BroadcastReadableMessageFactory, {
            create: function (payload) {
                return testUtils.stubPublicApi(sandbox, BroadcastReadableMessage, {
                    getBroadcastId: function () {
                        return currentBroadcastId;
                    },
                    getTimestamp: function () {
                        return currentTimestamp;
                    },
                    getPayload: function () {
                        return payload;
                    }
                });
            }
        });

        writableFactoryStub = testUtils.stubPublicApi(sandbox, BroadcastWritableMessageFactory, {
            constructPayload: function (id, payload) {
                return payload;
            }
        });

        routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
            getRandomContactNodesFromBucket: function (i, alpha, cb) {
                var ret = [];

                for (var k = 0; k < alpha; k++) {
                    var id = '';
                    for (var j = 0; j < 8; j++) {
                        var char = null;
                        if (j < i) {
                            char = Math.round(Math.random());
                        } else if (j == i) {
                            char = myId[7 - j] === '1' ? '0' : '1';
                        } else {
                            char = myId[7 - j];
                        }
                        id = char + id;
                    }
                    var node = null;
                    (function (theId) {
                        node = testUtils.stubPublicApi(sandbox, ContactNode, {
                            getId: function () {
                                return new Id(Id.byteBufferByBitString(theId, 1), 8);
                            }
                        });
                    })(id);

                    ret.push(node);

                    if (i === 0)
                        break;
                }

                cb(null, ret);
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=BroadcastManager.js.map
