/// <reference path='../../test.d.ts' />
require('should');

var net = require('net');

var JSONWebIp = require('../../../src/core/net/ip/JSONWebIp');

describe('CORE --> NET --> IP --> JSONWebIp', function () {
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
//# sourceMappingURL=JSONWebIp.js.map
