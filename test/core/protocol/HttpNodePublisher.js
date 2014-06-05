var http = require('http');

require('should');

var HttpNodePublisher = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/HttpNodePublisher');
var MyNode = require('../../../src/core/topology/MyNode');
var Id = require('../../../src/core/topology/Id');
var ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> HttpNodePublisher @current', function () {
    var server = null;

    var myNode = null;

    var postBody = null;

    before(function (done) {
        server = http.createServer(function (req, res) {
            if (req.method === 'POST') {
                postBody = '';
                req.on('data', function (data) {
                    postBody += data;
                });

                res.end();
            }
        });

        server.listen(7773, done);
    });

    after(function (done) {
        server.close(done);
    });

    it('should post my node to a HTTP server', function (done) {
        var address = (new ContactNodeAddressFactory).create('127.0.0.1', 5555);
        var id = new Id(Id.byteBufferByHexString('00200000000000e0009400010100000050f48602', 20), 160);
        myNode = new MyNode(id, []);
        var list = [{ hostname: '127.0.0.1', path: '/', port: 7773 }];

        var publisher = new HttpNodePublisher(list, myNode, 2);

        var expected = '{"id":"00200000000000e0009400010100000050f48602","addresses":[{"ip":"127.0.0.1","port":5555}]}';

        myNode.updateAddresses([address]);

        setTimeout(function () {
            if (postBody === expected)
                done();
        }, 100);
    });
});
//# sourceMappingURL=HttpNodePublisher.js.map
