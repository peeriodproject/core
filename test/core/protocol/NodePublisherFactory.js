require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');
var NodePublisherFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');
var MyNode = require('../../../src/core/topology/MyNode');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodePublisherFactory', function () {
    var sandbox = null;
    var myNode = null;
    var config = null;

    before(function () {
        sandbox = sinon.sandbox.create();
        myNode = testUtils.stubPublicApi(sandbox, MyNode, {
            getAddresses: function () {
                return [];
            }
        });
        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'app.dataPath')
                    return testUtils.getFixturePath('core/config');
                if (what === 'app.internalDataPath')
                    return testUtils.getFixturePath('core/config');
                if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig')
                    return 'nodeDiscovery.json';
                if (what === 'protocol.nodeDiscovery.republishInSeconds')
                    return 3;
            }
        });
    });

    it('should return a list of node publisher', function (done) {
        var factory = new NodePublisherFactory(config, config, myNode);
        factory.createPublisherList(function (list) {
            if (list.length === 1)
                done();
        });
    });

    it('should return an empty list when it cannot load the state file', function (done) {
        var cStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'app.dataPath')
                    return testUtils.getFixturePath('core/config/foo/');
                if (what === 'app.internalDataPath')
                    return testUtils.getFixturePath('core/config/foo/');
                if (what === 'protocol.nodeDiscovery.nodeSeekerFactoryStateConfig')
                    return 'nodeDiscovery.json';
                if (what === 'protocol.nodeDiscovery.republishInSeconds')
                    return 3;
            }
        });

        var factory = new NodePublisherFactory(cStub, cStub, myNode);
        factory.createPublisherList(function (list) {
            if (list.length === 0)
                done();
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=NodePublisherFactory.js.map
