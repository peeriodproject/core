/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');
import Id = require('../../../src/core/topology/Id');

describe('CORE --> TOPOLOGY --> ContactNodeFactory', function () {
	var sandbox:SinonSandbox;
	var idStub:any;
	var nodeAddressStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		idStub = testUtils.stubPublicApi(sandbox, Id);
		nodeAddressStub = testUtils.stubPublicApi(sandbox, ContactNodeAddress);
	});

	afterEach(function () {
		sandbox.restore();
	});

	it ('should correctly create contact nodes', function () {
		var contactNode = (new ContactNodeFactory()).create(idStub, [nodeAddressStub]);
		contactNode.should.be.an.instanceof(ContactNode);
	});

});