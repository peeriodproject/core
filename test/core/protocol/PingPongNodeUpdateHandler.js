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

describe('CORE --> PROTOCOL --> PING --> PingPongNodeUpdateHandler @current', function () {
    var sandbox;

    var pingPongHandler = null;
    var myNodeId = new Id(Id.byteBufferByBitString('10011001', 1), 8);

    // checkers used in tests
    var errorWhenPinging = null;
    var sentPong = false;
    var sentPongTo = null;
    var recentlyReplacedNode = null;
    var longestNotSeenNode = null;

    var onMessageCallback = null;
    var onContactNodeInfoCallback = null;

    var fireMessageEvent = function (type, bitstring) {
        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getMesageType: function () {
                return type;
            },
            getSender: function () {
                return createContactNodeStub(bitstring);
            }
        });
        onMessageCallback(msg);
    };

    var fireNewNodeInfo = function (bitstring) {
        return createContactNodeStub(bitstring);
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
                    return 0.1;
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
                    sentPong = true;
                    sentPongTo = node;
                } else if (type === 'PING') {
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
});
//# sourceMappingURL=PingPongNodeUpdateHandler.js.map
