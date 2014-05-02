/// <reference path='../../test.d.ts' />
require('should');

var net = require('net');

var FreeGeoIp = require('../../../src/core/net/ip/FreeGeoIp');

describe('CORE --> NET --> IP --> FREEGEOIP', function () {
    var freeGeoIp = new FreeGeoIp();

    it('should obtain the external IP', function (done) {
        freeGeoIp.obtainIP(function (err, ip) {
            if (ip && net.isIP(ip)) {
                done();
            }
        });
    });

    it('should get an invalid IP', function (done) {
        freeGeoIp.setIpAttribute('city');
        freeGeoIp.obtainIP(function (err, res) {
            freeGeoIp.setIpAttribute('ip');
            if (err && err.message === 'FreeGeoIp: Got no valid IP.')
                done();
        });
    });

    it('should give a non 200 response', function (done) {
        freeGeoIp.setUrl('http://freegeoip.net/json2');
        freeGeoIp.obtainIP(function (err, res) {
            if (err && err.message === 'FreeGeoIp: No 200 response.')
                done();
        });
    });

    it('should not be able to parse the JSON', function (done) {
        freeGeoIp.setUrl('http://google.com');
        freeGeoIp.obtainIP(function (err, res) {
            if (err && err instanceof Error)
                done();
        });
    });
});
//# sourceMappingURL=FreeGeoIp.js.map
