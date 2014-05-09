/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import Id = require('../../../src/core/topology/Id');
import MyNodeInterface = require('../../../src/core/topology/interfaces/MyNodeInterface');
import ContactNodeAddressListInterface = require('../../../src/core/topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

import MyNode = require('../../../src/core/topology/MyNode');

describe('CORE --> TOPOLOGY --> MyNode', function () {

	var sandbox:SinonSandbox;
	var id:any;
	var address_a:any;
	var address_b:any;

	before(function () {
		sandbox = sinon.sandbox.create();
		id = testUtils.stubPublicApi(sandbox, Id);
		address_a = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
		address_b = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
	});

	it('should correctly initialize MyNode', function () {
		var list:ContactNodeAddressListInterface = [address_a];
		var myNode = new MyNode(id, list);

		myNode.should.be.instanceof(MyNode);

		myNode.getAddresses().should.containDeep(list);
		myNode.getId().should.equal(id);
	});

	it('should emit the addressChangeEvent', function (done) {
		var list_a:ContactNodeAddressListInterface = [address_a];
		var list_b:ContactNodeAddressListInterface = [address_b];
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

		var list_a:ContactNodeAddressListInterface = [address_a];
		var list_b:ContactNodeAddressListInterface = [address_b];
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

