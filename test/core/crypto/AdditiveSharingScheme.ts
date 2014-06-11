/// <reference path='../../test.d.ts' />

import crypto = require('crypto');

require('should');

import AdditiveSharingScheme = require('../../../src/core/crypto/AdditiveSharingScheme');

describe('CORE --> CRYPTO --> AdditiveSharingScheme', function () {

	it('should successfully encrypt and decrypt random data', function (done) {

		var times = 100;
		var success = 0;

		for (var i = 0; i < times; i++) {
			var input = crypto.pseudoRandomBytes(2048);

			(function (ip, j) {
				var expected = ip.toString('hex');

				AdditiveSharingScheme.getShares(ip, 5, ip.length, function (shares) {
					if (AdditiveSharingScheme.getCleartext(shares).toString('hex') === expected) {
						if (++success === times) done();
					}
					else {
						throw new Error('Additive sharing failed in iteration ' + j);
					}
				});
			})(input, i);
		}
	});

});