/// <reference path='../../test.d.ts' />

require('should');

import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

describe('CORE --> TOPOLOGY --> ContactNodeAddressFactory', function () {

	it ('should correctly create contact node addresses', function () {
		var contactNode = (new ContactNodeAddressFactory()).create('123.123.123.123', 8080);
		contactNode.should.be.an.instanceof(ContactNodeAddress);
	});

});