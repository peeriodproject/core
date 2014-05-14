require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
var TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var MyNode = require('../../../src/core/topology/MyNode');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
var Id = require('../../../src/core/topology/Id');
var ContactNode = require('../../../src/core/topology/ContactNode');
var RoutingTable = require('../../../src/core/topology/RoutingTable');

describe('CORE --> PROTOCOL --> PROXY --> ProxyManager @current', function () {
    this.timeout(0);

    var sandbox;

    var getRandomNode = function () {
        if (has_proxy_a) {
            has_proxy_b = true;
            return canProxyNodeB;
        }
        return canProxyNodeA;
    };

    // needs proxy
    var needsProxyNode;
    var needsProxyManager;

    // can proxy
    var canProxyNodeA;
    var canProxyNodeB;
    var canProxyManagerA;
    var canProxyManagerB;

    var has_proxy_a = false;
    var has_proxy_b = false;

    // okay, we have to build up 3 machines: 2 who can proxy, 1 who needs proxies.
    before(function (done) {
        sandbox = sinon.sandbox.create();

        var createProxyManager = function (openPort, hexString, callback) {
            var tcpSocketHandlerOptions = {
                allowHalfOpenSockets: false,
                myExternalIp: '127.0.0.1',
                myOpenPorts: openPort ? [openPort] : [],
                doKeepAlive: true,
                idleConnectionKillTimeout: 1.2,
                outboundConnectionTimeout: 500
            };
            var tcpSocketHandler = new TCPSocketHandler(new TCPSocketFactory(), tcpSocketHandlerOptions);

            var protocolConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
                get: function (key) {
                    if (key === 'protocol.messages.maxByteLengthPerMessage')
                        return 1024 * 1024;
                    if (key === 'protocol.messages.msToKeepNonAddressableMemory')
                        return 2000;
                    if (key === 'protocol.messages.msToWaitForIncomingMessage')
                        return 500;
                    if (key === 'protocol.messages.maxSecondsToWaitForConnection')
                        return 2;

                    if (key === 'protocol.proxy.maxNumberOfProxies')
                        return 2;
                    if (key === 'protocol.proxy.proxyForMaxNumberOfNodes')
                        return 1;
                    if (key === 'protocol.proxy.waitForNodeReactionInSeconds')
                        return 1;
                    if (key === 'protocol.proxy.maxUnsuccessfulProxyTries')
                        return 1;
                    if (key === 'protocol.proxy.unsuccessfulProxyTryWaitTimeInSeconds')
                        return 1;
                }
            });

            var myNode = new MyNode(new Id(Id.byteBufferByHexString(hexString, 20), 160), null);

            var routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
                getRandomContactNode: function (callback) {
                    callback(null, getRandomNode());
                }
            });

            tcpSocketHandler.autoBootstrap(function (openPorts) {
                if ((openPort && (openPorts[0] === openPort)) || !openPort) {
                    var protManager = new ProtocolConnectionManager(protocolConfigStub, myNode, tcpSocketHandler);
                    var proxManager = new ProxyManager(protocolConfigStub, protManager, routingTableStub);
                    callback(proxManager);
                }
            });
        };

        createProxyManager(null, '06000000050000000a000000aa150000e8700202', function (mngr) {
            needsProxyNode = new ContactNode(mngr.getMyNode().getId(), mngr.getMyNode().getAddresses(), 0);
            needsProxyManager = mngr;

            createProxyManager(54000, '02000000aa150000f07002020100000001000000', function (manager) {
                canProxyNodeA = new ContactNode(manager.getMyNode().getId(), manager.getMyNode().getAddresses(), 0);
                canProxyManagerA = manager;

                createProxyManager(54001, 'd8700202010000000200000000170000e0700202', function (m) {
                    canProxyNodeB = new ContactNode(m.getMyNode().getId(), m.getMyNode().getAddresses(), 0);
                    canProxyManagerB = m;
                    done();
                });
            });
        });
    });

    after(function () {
        sandbox.restore();
    });

    /**
    * -------------------- TESTS BEGIN
    */
    it('needsProxyNode should have need of proxy', function () {
        needsProxyManager.needsAdditionalProxy().should.be.true;
    });

    it('canProxyNodes should be proxy capable', function () {
        canProxyManagerA.isProxyCapable().should.be.true;
        canProxyManagerB.isProxyCapable().should.be.true;
    });
});
//# sourceMappingURL=ProxyManager.js.map
