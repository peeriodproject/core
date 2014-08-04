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

describe('CORE --> PROTOCOL --> PROXY --> ProxyManager', function () {
    this.timeout(0);

    var sandbox;

    var getRandomNode = function () {
        if (has_proxy_a) {
            return canProxyNodeB;
        }
        has_proxy_a = true;
        return canProxyNodeA;
    };

    // needs proxy
    var needsProxyNodeA;
    var needsProxyManagerA;

    var needsProxyNodeB;
    var needsProxyManagerB;

    // can proxy
    var canProxyNodeA;
    var canProxyNodeB;
    var canProxyManagerA;
    var canProxyManagerB;

    var has_proxy_a = false;

    var toIdent = function (node) {
        return node.getId().toHexString();
    };

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
                    if (key === 'protocol.waitForNodeReactionInSeconds')
                        return 1;
                    if (key === 'protocol.proxy.maxUnsuccessfulProxyTries')
                        return 2;
                    if (key === 'protocol.proxy.unsuccessfulProxyTryWaitTimeInSeconds')
                        return 1.5;
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
            needsProxyNodeA = new ContactNode(mngr.getMyNode().getId(), mngr.getMyNode().getAddresses(), 0);
            needsProxyManagerA = mngr;

            createProxyManager(null, '0100000084220000687102020100000001000000', function (mr) {
                needsProxyNodeB = new ContactNode(mr.getMyNode().getId(), mr.getMyNode().getAddresses(), 0);
                needsProxyManagerB = mr;

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
    });

    after(function () {
        sandbox.restore();
    });

    /**
    * -------------------- TESTS BEGIN
    */
    it('needsProxyNodeA should have need of proxy', function () {
        needsProxyManagerA.needsAdditionalProxy().should.be.true;
    });

    it('canProxyNodes should be proxy capable', function () {
        canProxyManagerA.isProxyCapable().should.be.true;
        canProxyManagerB.isProxyCapable().should.be.true;
    });

    it('needsProxyNodeA should successfully build up his proxies', function (done) {
        needsProxyManagerA.kickOff();

        setTimeout(function () {
            var requestedList = needsProxyManagerA.getRequestedProxies();
            var proxyList = needsProxyManagerA.getConfirmedProxies();
            var identA = toIdent(canProxyNodeA);
            var identB = toIdent(canProxyNodeB);

            if (!requestedList[identA] && !requestedList[identB]) {
                if (proxyList[identA].getId().toHexString() === identA && proxyList[identB].getId().toHexString() === identB) {
                    done();
                }
            }
        }, 3000);
    });

    it('needsProxyNodeA should have the proxy addresses set on my node', function () {
        var addresses = needsProxyManagerA.getMyNode().getAddresses();
        for (var i = 0; i < addresses.length; i++) {
            ([54000, 54001]).indexOf(addresses[i].getPort()).should.be.above(-1);
        }
        addresses.length.should.equal(2);
    });

    it('the proxies should have needProxyNodeA in their proxyFor list', function () {
        var ident = toIdent(needsProxyNodeA);
        canProxyManagerA.getProxyingFor()[ident].getId().toHexString().should.equal(ident);
        canProxyManagerB.getProxyingFor()[ident].getId().toHexString().should.equal(ident);
    });

    it('canProxyA and canProxyB should reject needProxyB\'s request', function (done) {
        has_proxy_a = false;
        var count = 0;

        var listener = function (msg) {
            if (msg.getMessageType() === 'PROXY_REJECT') {
                count++;
                if (count === 2) {
                    needsProxyManagerB.getProtocolConnectionManager().removeListener('message', listener);
                    process.nextTick(function () {
                        if (Object.keys(needsProxyManagerB.getConfirmedProxies()).length === 0)
                            done();
                    });
                }
            }
        };

        needsProxyManagerB.getProtocolConnectionManager().on('message', listener);

        needsProxyManagerB.kickOff();
    });

    it('proxy cycle should be blocked and later unblock', function (done) {
        if (needsProxyManagerB.isBlocked()) {
            var check = function () {
                setTimeout(function () {
                    if (needsProxyManagerB.isBlocked()) {
                        check();
                    } else {
                        needsProxyManagerB.block();
                        done();
                    }
                }, 0);
            };

            check();
        }
    });

    it('needsProxyNodeA should successfully get the message from needsProxyManagerB', function (done) {
        var nodeA = new ContactNode(needsProxyManagerA.getMyNode().getId(), needsProxyManagerA.getMyNode().getAddresses(), 0);
        needsProxyManagerB.getProtocolConnectionManager().writeMessageTo(nodeA, 'PING', new Buffer('foobar', 'utf8'));
        needsProxyManagerA.once('message', function (msg) {
            if (msg.getPayload().toString('utf8') === 'foobar')
                done();
        });
    });

    it('should correctly remove the nodes on terminating the connections', function (done) {
        var hydraMsg = new Buffer([0, 0, 0, 20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        needsProxyManagerA.getProtocolConnectionManager().writeBufferTo(canProxyNodeA, hydraMsg);

        needsProxyManagerA.getProtocolConnectionManager().once('terminatedConnection', function () {
            if (Object.keys(needsProxyManagerA.getConfirmedProxies()).length === 1) {
                if (needsProxyManagerA.getMyNode().getAddresses().length === 1) {
                    if (canProxyManagerA.isProxyCapable() === true)
                        done();
                }
            }
        });
    });

    it('should timeout the proxy request', function (done) {
        canProxyManagerA.getProtocolConnectionManager().removeAllListeners('message');
        has_proxy_a = false;
        needsProxyManagerA.on('requestProxyTimeout', function (identifier) {
            if (identifier === toIdent(canProxyNodeA))
                done();
        });
    });
});
//# sourceMappingURL=ProxyManager.js.map
