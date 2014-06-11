/// <reference path='../../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import HydraConnectionManager = require('../../../../src/core/protocol/hydra/HydraConnectionManager');
import ProtocolConnectionManager = require('../../../../src/core/protocol/net/ProtocolConnectionManager');
import ObjectConfig = require('../../../../src/core/config/ObjectConfig');
import TCPSocket = require('../../../../src/core/net/tcp/TCPSocket');

describe('CORE --> PROTOCOL --> HYDRA --> HydraConnectionManager @current', function () {

	var sandbox:SinonSandbox = null;
	var connectionManager:HydraConnectionManager = null;

	var hydraSocketKeptOpen:string = null;
	var hydraSocketKeptNoLongerOpen:string = null;

	var hydraSocketListener:Function = null;
	var terminatedConnectionListener:Function = null;

	var connectErr = null;

	var socketEndedWithIdent = null;

	var writtenTo = null;
	var writtenWhat = null;

	// --- Function helpers

	var emitSocket = function (identifier, socketIp) {
		hydraSocketListener(identifier, testUtils.stubPublicApi(sandbox, TCPSocket, {
			end: function () {
				socketEndedWithIdent = identifier;
			},
			getIP: function () {
				return socketIp;
			}
		}));
	};

	var emitTerminated = function (identifier) {
		terminatedConnectionListener(identifier);
	}

	before(function () {
		sandbox = sinon.sandbox.create();

		var configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'hydra.keepMessageInPipelineForSeconds') return 1;
				if (what === 'hydra.waitForReconnectInSeconds') return 1;
				if (what === 'hydra.retryConnectionMax') return 2;
			}
		});

		var protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
			keepHydraSocketOpen: function (identifier) {
				hydraSocketKeptOpen = identifier;
			},
			keepHydraSocketNoLongerOpen: function (identifier) {
				hydraSocketKeptNoLongerOpen = identifier;
			},
			on: function (evt, cb) {
				if (evt === 'hydraSocket') {
					hydraSocketListener = cb;
				}
				else if (evt === 'terminatedConnection') {
					terminatedConnectionListener = cb;
				}
			},
			hydraConnectTo: function (port, ip, cb) {
				cb(connectErr);
			},
			hydraWriteMessageTo: function (identifier, payload) {
				writtenTo = identifier;
				writtenWhat = payload;
			}
		});

		connectionManager = new HydraConnectionManager(configStub, protocolConnectionManagerStub);

	});

	it('should add the node to the circuit nodes', function () {
		connectionManager.addToCircuitNodes({ip: '1'});
		connectionManager.getCircuitNodeList()['1'].ip.should.equal('1');
	});

	it('should add the socket to open sockets and keep the existing hydra socket open', function (done) {
		connectionManager.on('1', function (identifier) {
			if (identifier === 'hydra1') {
				if (hydraSocketKeptOpen === identifier) {
					if (connectionManager.getOpenSocketList()['1'] === identifier) done();
				}
			}
		});

		emitSocket('hydra1', '1');
	});

	it('should end the socket if it is already present under this ip', function () {
		emitSocket('hydra2', '1');

		socketEndedWithIdent.should.equal('hydra2');
	});

	it('should try to successfully wait for a new connection', function (done) {
		emitTerminated('hydra1');
		connectionManager.once('globalConnectionFail', function () {
			throw new Error('This should not happen.');
		});

		setTimeout(function () {
			connectionManager.once('reconnectedTo', function (ip) {
				if (ip === '1') {
					setTimeout(function () {
						if (connectionManager.getOpenSocketList()['1'] === 'hydra3') {
							connectionManager.removeAllListeners('globalConnectionFail');
							done();
						}
					}, 1000);
				}
			});

			emitSocket('hydra3', '1');

		}, 100);
	});

	it('should unsuccessfully wait for a new connection and emit globalConnectionFail', function (done) {
		emitTerminated('hydra3');
		connectionManager.once('globalConnectionFail', function (ip) {
			if (ip === '1') done();
		});
	});

	it('should keep this circuit socket open', function () {
		emitSocket('hydra4', '2');

		connectionManager.addToCircuitNodes({ip: '2', port: 20});

		hydraSocketKeptOpen.should.equal('hydra4');
	});

	it('should successfully reconnect to the ip', function (done) {
		connectionManager.once('reconnectedTo', function (ip) {
			if (ip === '2') done();
		});

		emitTerminated('hydra4');
	});

	it('should unsuccessfully reconnect to the ip', function (done) {
		connectErr = new Error();
		emitSocket('hydra5', '2');

		connectionManager.once('globalConnectionFail', function (ip) {
			if (ip === '2') done();
		});

		emitTerminated('hydra5');
	});

	it('should remove the node from the circuit nodes and no longer keep the socket open', function () {
		emitSocket('hydra6', '2');

		connectionManager.removeFromCircuitNodes({ip:'2'});

		(connectionManager.getCircuitNodeList()[2] === undefined).should.be.true;
		hydraSocketKeptNoLongerOpen.should.equal('hydra6');
	});

	it('should add the ip to open sockets, but then remove it', function () {
		emitSocket('hydra7', '4');

		connectionManager.getOpenSocketList()['4'].should.equal('hydra7');

		emitTerminated('hydra7');

		(connectionManager.getOpenSocketList()['4'] === undefined).should.be.true;
	});

	it('should write the message at once', function () {
		emitSocket('hydra8', '5');

		connectionManager.pipeMessage(new Buffer('foobar'), {ip:'5'});

		writtenTo.should.equal('hydra8');
		writtenWhat.toString().should.equal('foobar');
	});

	after(function () {
		sandbox.restore();
	});

});
