require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var NodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeeker');

var NodeSeekerFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');
var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
var ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');

var ContactNode = require('../../../src/core/topology/ContactNode');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> NodeSeekerManager @current', function () {
    var sandbox = null;
    var proxyStub = null;
    var protocolConnectionManagerStub = null;
    var factoryStub = null;

    var onContactCallback = null;

    var emitActiveNode = function (node) {
        if (onContactCallback) {
            onContactCallback(node);
            onContactCallback = null;
        }
    };

    var createSeeker = function (idString) {
        return testUtils.stubPublicApi(sandbox, NodeSeeker, {
            seek: function (cb) {
                if (idString) {
                    return testUtils.stubPublicApi(sandbox, ContactNode, {
                        getId: function () {
                            return idString;
                        }
                    });
                } else {
                    cb(null);
                }
            }
        });
    };

    // checkers
    var sentPingTo = null;
    var createOnNextTick = false;

    before(function () {
        sandbox = sinon.sandbox.create();

        proxyStub = testUtils.stubPublicApi(sandbox, ProxyManager, {
            once: function (evt, cb) {
                if (evt === 'contactNodeInformatino')
                    onContactCallback = cb;
            }
        });

        protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            writeMessageTo: function (who, type) {
                if (type === 'PING')
                    sentPingTo = who;
            }
        });

        factoryStub = testUtils.stubPublicApi(sandbox, NodeSeekerFactory, {
            createSeekerList: function (cb) {
                var list = [createSeeker('foo'), createSeeker(null), createSeeker('bar')];

                if (createOnNextTick) {
                    process.nextTick(function () {
                        cb(list);
                    });
                } else
                    cb(list);
            }
        });
    });

    it('should', function () {
        (1).should.equal(1);
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=NodeSeekerManager.js.map
