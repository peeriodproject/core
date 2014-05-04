/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
var ContactNode = require('../../../src/core/topology/ContactNode');
var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');
var Id = require('../../../src/core/topology/Id');

describe('CORE --> TOPOLOGY --> ContactNodeFactory', function () {
    var sandbox;
    var idStub;
    var nodeAddressStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        idStub = testUtils.stubPublicApi(sandbox, Id);
        nodeAddressStub = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly create Buckets', function () {
        var contactNode = (new ContactNodeFactory()).create(idStub, [nodeAddressStub]);
        contactNode.should.be.an.instanceof(ContactNode);
    });
});
//# sourceMappingURL=ContactNodeFactory.js.map
