/// <reference path='../../test.d.ts' />

require('should');

import net = require('net');

import JSONWebIp = require('../../../src/core/net/ip/JSONWebIp');


describe('CORE --> NET --> IP --> JSONWebIp @current', function () {
	this.timeout(0);

	var webIp = new JSONWebIp();

	it('should obtain the external IP', function (done) {
		webIp.obtainIP(function (err, ip) {
			if (ip && net.isIP(ip)) {
				done();
			}
		});
	});

});