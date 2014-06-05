/// <reference path='../../test.d.ts' />
var http = require('http');

require('should');

var sinon = require('sinon');

var HttpNodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/HttpNodeSeeker');
var ContactNode = require('../../../src/core/topology/ContactNode');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
var ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> HttpNodeSeeker @current', function () {
    var sandbox = null;

    var server = null;
    var seeker = null;

    var serverInfo1 = {
        hostname: '127.0.0.1',
        path: '/',
        port: 7777
    };

    var serverInfo2 = {
        hostname: '111.111.111.111',
        path: '/',
        port: 77
    };

    var serverList = [
        serverInfo2, serverInfo1
    ];

    var resCode = 200;
    var resData = {
        id: '0020000000000050009400010100000050fa8601',
        addresses: [{
                ip: '127.0.0.1',
                port: 80
            }]
    };

    before(function (done) {
        sandbox = sinon.sandbox.create();

        server = http.createServer(function (req, res) {
            if (req.method === 'GET') {
                res.statusCode = resCode;
                res.end(JSON.stringify(resData));
            }
        });

        server.on('error', function (err) {
            console.log(err);
        });

        server.listen(7777, done);
    });

    after(function (done) {
        sandbox.restore();

        server.close(done);
    });

    it('should correctly return a node', function (done) {
        seeker = new HttpNodeSeeker(serverList, 200);
        seeker.setAddressFactory(new ContactNodeAddressFactory());
        seeker.setNodeFactory(new ContactNodeFactory());

        seeker.seek(function (node) {
            console.log(node);
            if (node instanceof ContactNode === true)
                done();
        });
    });

    it('should return null on 500 response', function (done) {
        resCode = 500;
        seeker.seek(function (node) {
            if (node === null)
                done();
        });
    });

    it('should return null on an error when converting the json', function (done) {
        resData.id = 'mumu';
        resCode = 200;

        seeker.seek(function (node) {
            if (node === null)
                done();
        });
    });
});
//# sourceMappingURL=HttpNodeSeeker.js.map
