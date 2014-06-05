/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');
var RoutingTableNodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/RoutingTableNodeSeeker');
var RoutingTable = require('../../../src/core/topology/RoutingTable');
var ContactNode = require('../../../src/core/topology/ContactNode');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> RoutingTableNodeSeeker', function () {
    var sandbox = null;
    var routingTableStub = null;

    var returnError = false;

    before(function () {
        sandbox = sinon.sandbox.create();

        routingTableStub = testUtils.stubPublicApi(sandbox, RoutingTable, {
            getRandomContactNode: function (callback) {
                if (returnError) {
                    callback(new Error(), null);
                } else {
                    callback(null, testUtils.stubPublicApi(sandbox, ContactNode));
                }
            }
        });
    });

    it('should return a contact node', function (done) {
        (new RoutingTableNodeSeeker(routingTableStub)).seek(function (node) {
            if (node)
                done();
        });
    });

    it('should return null on error', function (done) {
        returnError = true;
        (new RoutingTableNodeSeeker(routingTableStub)).seek(function (node) {
            if (node === null)
                done();
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=RoutingTableNodeSeeker.js.map
