import http = require('http');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import HttpNodePublisher = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodePublisher/HttpNodePublisher');
import MyNode = require('../../../src/core/topology/MyNode')
import Id = require('../../../src/core/topology/Id')
import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import HttpServerInfo = require('../../../src/core/net/interfaces/HttpServerInfo');
import HttpServerList = require('../../../src/core/net/interfaces/HttpServerList');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> HttpNodePublisher @current', function () {

	var server:http.Server = null;

	var myNode:MyNode = null;

	var postBody:string = null;

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

		server.listen(7777, done);
	});

	after(function (done) {
		server.close(done);
	});

	it('should post my node to a HTTP server', function (done) {
		var address = (new ContactNodeAddressFactory).create('127.0.0.1', 5555);
		var id = new Id(Id.byteBufferByHexString('00200000000000e0009400010100000050f48602', 20),160);
		myNode = new MyNode(id, []);
		var list:HttpServerList = [{hostname:'127.0.0.1', path:'/', port:7777}];

		var publisher = new HttpNodePublisher(list, myNode);
		var expected = '{"id":"00200000000000e0009400010100000050f48602","addresses":[{"ip":"127.0.0.1","port":5555}]}';

		myNode.updateAddresses([address]);

		setTimeout(function () {
			if (postBody === expected) done();
		}, 100);
	});

});