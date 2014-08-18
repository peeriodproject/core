require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');
var NodeSeekerFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodeSeekerFactory', function () {
    var sandbox = null;
    var routingTable = null;
    var appConfig = null;
    var protocolConfig = null;

    before(function () {
        sandbox = sinon.sandbox.create();
        routingTable = testUtils.stubPublicApi(sandbox, RoutingTable);
        appConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'app.dataPath')
                    return testUtils.getFixturePath('core/config');
                if (what === 'app.internalDataPath')
                    return testUtils.getFixturePath('core/config');
            }
        });
        protocolConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig')
                    return 'nodeDiscovery.json';
            }
        });
    });

    it('should return a list of node seekers', function (done) {
        var factory = new NodeSeekerFactory(appConfig, protocolConfig, routingTable);
        factory.createSeekerList(function (list) {
            if (list.length === 2)
                done();
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=NodeSeekerFactory.js.map
