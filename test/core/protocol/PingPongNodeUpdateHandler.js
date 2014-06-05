/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var PingPongNodeUpdateHandler = require('../../../src/core/protocol/ping/PingPongNodeUpdateHandler');
var Id = require('../../../src/core/topology/Id');
var MyNode = require('../../../src/core/topology/MyNode');
var ContactNode = require('../../../src/core/topology/ContactNode');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
var ReadableMessage = require('../../../src/core/protocol/messages/ReadableMessage');

describe('CORE --> PROTOCOL --> PING --> PingPongNodeUpdateHandler', function () {
    this.timeout(0);

    var sandbox;

    var pingPongHandler = null;
    var myNodeId = new Id(Id.byteBufferByBitString('10011001', 1), 8);

    // checkers used in tests
    var errorWhenPinging = null;

    var sentPongTo = null;
    var sentPingTo = null;
    var recentlyReplacedNode = null;
    var longestNotSeenNode = null;

    var onMessageCallback = null;
    var onContactNodeInfoCallback = null;

    var fireMessageEvent = function (type, bitstring) {
        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getMessageType: function () {
                return type;
            },
            getSender: function () {
                return createContactNodeStub(bitstring);
            }
        });

        onMessageCallback(msg);
    };

    var fireNewNodeInfo = function (bitstring) {
        onContactNodeInfoCallback(createContactNodeStub(bitstring));
    };

    var createContactNodeStub = function (bitstring) {
        return testUtils.stubPublicApi(sandbox, ContactNode, {
            getId: function () {
                return new Id(Id.byteBufferByBitString(bitstring, 1), 8);
            }
        });
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        var configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'protocol.waitForNodeReactionInSeconds')
                    return 1;
                if (what === 'protocol.pingpong.maxWaitingListSize')
                    return 2;
            }
        });

        var myNodeStub = testUtils.stubPublicApi(sandbox, MyNode, {
            getId: function () {
                return myNodeId;
            }
        });

        var connectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            writeMessageTo: function (node, type, payload, callback) {
                if (type === 'PONG') {
                    sentPongTo = node;
                } else if (type === 'PING') {
                    sentPingTo = node;
                    callback(errorWhenPinging);
                }
            }
        });

        var proxyManagerStub = testUtils.stubPublicApi(sandbox, ProxyManager, {
            on: function (what, cb) {
                if (what === 'message') {
                    onMessageCallback = cb;
                } else if (what === 'contactNodeInformation') {
                    onContactNodeInfoCallback = cb;
                }
            }
        });

        var routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
            replaceContactNode: function (replacedNode, n) {
                recentlyReplacedNode = replacedNode;
            },
            updateContactNode: function (a, cb) {
                if (!longestNotSeenNode) {
                    cb(null);
                } else {
                    cb(new Error('err'), longestNotSeenNode);
                }
            }
        });

        pingPongHandler = new PingPongNodeUpdateHandler(configStub, myNodeStub, connectionManagerStub, proxyManagerStub, routingTableStub);
    });

    after(function () {
        sandbox.restore();
    });

    it('should correctly instantiate ping pong handler', function () {
        pingPongHandler.should.be.instanceof(PingPongNodeUpdateHandler);
    });

    it('should pong the other node', function (done) {
        var bits = '11111111';
        fireMessageEvent('PING', bits);
        process.nextTick(function () {
            if (sentPongTo.getId().toBitString() === bits) {
                sentPongTo = null;
                done();
            }
        });
    });

    it('should ping a node and timeout on no response, as well as correctly handling the waiting lists', function (done) {
        longestNotSeenNode = createContactNodeStub('11000000');
        fireNewNodeInfo('11100000');

        process.nextTick(function () {
            if (sentPingTo.getId().toBitString() === '11000000') {
                var waitingLists = pingPongHandler.getWaitingLists();
                if (waitingLists[6][0].nodeToCheck.getId().toBitString() === '11000000') {
                    pingPongHandler.once('pingTimeout', function () {
                        sentPingTo = null;
                        if (!waitingLists[6][0] && recentlyReplacedNode.getId().toBitString() === '11000000')
                            done();
                    });
                }
            }
        });
    });

    it('should replace the node when not being able to send a ping', function (done) {
        longestNotSeenNode = createContactNodeStub('10100000');
        errorWhenPinging = new Error();
        fireNewNodeInfo('10110000');

        process.nextTick(function () {
            errorWhenPinging = null;
            if (pingPongHandler.getWaitingLists()[5].length === 0 && recentlyReplacedNode.getId().toBitString() === '10100000')
                done();
        });
    });

    it('should receive a pong', function (done) {
        longestNotSeenNode = createContactNodeStub('10100000');
        fireNewNodeInfo('10110000');

        pingPongHandler.once('gotPonged', function (node) {
            if (node.getId().toBitString() === '10100000' && pingPongHandler.getWaitingLists()[5].length === 0)
                done();
        });

        process.nextTick(function () {
            fireMessageEvent('PONG', '10100000');
        });
    });

    it('should work its way through the waiting list', function (done) {
        longestNotSeenNode = createContactNodeStub('10100000');
        fireNewNodeInfo('10110000');

        process.nextTick(function () {
            longestNotSeenNode = createContactNodeStub('10111000');
            fireNewNodeInfo('10111100');

            pingPongHandler.once('pingTimeout', function (node) {
                if (node.getId().toBitString() === '10100000') {
                    process.nextTick(function () {
                        pingPongHandler.on('gotPonged', function (node) {
                            if (node.getId().toBitString() === '10111000' && pingPongHandler.getWaitingLists()[5].length === 0)
                                done();
                        });
                        fireMessageEvent('PONG', '10111000');
                    });
                }
            });
        });
    });

    it('should be able to add the new node when the bucket is no longer full', function (done) {
        longestNotSeenNode = createContactNodeStub('10100000');
        fireNewNodeInfo('10110000');

        process.nextTick(function () {
            longestNotSeenNode = createContactNodeStub('10111000');
            fireNewNodeInfo('10111100');

            longestNotSeenNode = null;
            pingPongHandler.once('pingTimeout', function (node) {
                if (node.getId().toBitString() === '10100000') {
                    process.nextTick(function () {
                        if (pingPongHandler.getWaitingLists()[5].length === 0)
                            done();
                    });
                }
            });
        });
    });

    it('should not add a node to the waiting list if it is full', function (done) {
        longestNotSeenNode = createContactNodeStub('10100000');
        fireNewNodeInfo('10110000');
        fireNewNodeInfo('10110000');
        fireNewNodeInfo('10110000');
        process.nextTick(function () {
            if (pingPongHandler.getWaitingLists()[5].length === 2)
                done();
        });
    });
});
//# sourceMappingURL=PingPongNodeUpdateHandler.js.map
