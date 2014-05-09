/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var Id = require('../../../src/core/topology/Id');

var ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

var MyNode = require('../../../src/core/topology/MyNode');

describe('CORE --> TOPOLOGY --> MyNode', function () {
    var sandbox;
    var id;
    var address_a;
    var address_b;

    before(function () {
        sandbox = sinon.sandbox.create();
        id = testUtils.stubPublicApi(sandbox, Id);
        address_a = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
        address_b = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
    });

    it('should correctly initialize MyNode', function () {
        var list = [address_a];
        var myNode = new MyNode(id, list);

        myNode.should.be.instanceof(MyNode);

        myNode.getAddresses().should.containDeep(list);
        myNode.getId().should.equal(id);
    });

    it('should emit the addressChangeEvent', function (done) {
        var list_a = [address_a];
        var list_b = [address_b];
        var myNode = new MyNode(id, list_a);

        myNode.onAddressChange(function () {
            myNode.getAddresses().should.containDeep(list_b);
            done();
        });

        myNode.updateAddresses(list_b);
    });

    it('should successfully remove the listener on address change', function (done) {
        var callback = function () {
            throw new Error('Should not happen, nope, nope');
        };

        var list_a = [address_a];
        var list_b = [address_b];
        var myNode = new MyNode(id, list_a);

        myNode.onAddressChange(callback);
        myNode.removeOnAddressChange(callback);

        myNode.updateAddresses(list_b);
        done();
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=MyNode.js.map
