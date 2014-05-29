/// <reference path='../../test.d.ts' />

import http = require('http');

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import HttpNodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/HttpNodeSeeker');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNodeAddressFactory = require('../../../src/core/topology/ContactNodeAddressFactory');
import HttpServerInfo = require('../../../src/core/net/interfaces/HttpServerInfo');
import HttpServerList = require('../../../src/core/net/interfaces/HttpServerList');


describe('CORE --> PROTOCOL --> NODE DISCOVERY --> HttpNodeSeeker', function () {

	var sandbox:SinonSandbox = null;

	var server:http.Server = null;
	var seeker:HttpNodeSeeker = null;

	var serverInfo1:HttpServerInfo = {
		hostname: '127.0.0.1',
		path: '/',
		port: 7777
	};

	var serverInfo2:HttpServerInfo = {
		hostname: '111.111.111.111',
		path: '/',
		port: 77
	}

	var serverList:HttpServerList = [
		serverInfo2, serverInfo1
	];

	var resCode = 200;
	var resData = {
		id: '0020000000000050009400010100000050fa8601',
		addresses: [{
			ip: '127.0.0.1',
			port: '80'
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
			if (node instanceof ContactNode) done();
		});
	});

	it('should return null on 500 response', function (done) {
		resCode = 500;
		seeker.seek(function (node) {
			if (node === null) done();
		});
	});

	it('should return null on an error when converting the json', function (done) {
		resData.id = 'mumu';
		resCode = 200;

		seeker.seek(function (node) {
			if (node === null) done();
		});
	});

});