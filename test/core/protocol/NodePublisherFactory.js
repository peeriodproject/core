require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');
var NodePublisherFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/NodePublisherFactory');
var MyNode = require('../../../src/core/topology/MyNode');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> NODE DISOVERY --> NodePublisherFactory @current', function () {
    var sandbox = null;
    var myNode = null;
    var appConfig = null;

    before(function () {
        sandbox = sinon.sandbox.create();
        myNode = testUtils.stubPublicApi(sandbox, MyNode, {
            getAddresses: function () {
                return [];
            }
        });
        appConfig = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'app.dataPath')
                    return testUtils.getFixturePath('core/config');
            }
        });
    });

    it('should return a list of node publisher', function (done) {
        var factory = new NodePublisherFactory(appConfig, myNode);
        factory.createPublisherList(function (list) {
            if (list.length === 1)
                done();
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=NodePublisherFactory.js.map
