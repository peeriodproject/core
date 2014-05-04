/// <reference path='../../test.d.ts' />

require('should');

import ContactNodeAddress = require('../../../src/core/topology/ContactNodeAddress');

describe('CORE --> TOPOLOGY --> ContactNodeAddress', function () {

	it ('should return the correct ip', function () {
		var ip:string = '123.123.123.123';

		new ContactNodeAddress(ip, 80).getIp().should.equal(ip);
	});

	it ('should return the correct port', function () {
		var port:number = 8080;

		new ContactNodeAddress('', port).getPort().should.equal(port);
	});

});