/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');
import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import CellManager = require('../../../../src/core/protocol/hydra/CellManager');
import ProtocolConnectionManager = require('../../../../src/core/protocol/net/ProtocolConnectionManager');
import WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
import Middleware = require('../../../../src/core/protocol/fileTransfer/Middleware');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Middleware @current', function () {

	var sandbox:SinonSandbox = null;

	var socketCount:number = 0;
	var openSockets:Array<string> = [];

	var protocolConnectionManagerStub:any = null;
	var hydraMessageCenterStub:any = null;
	var writableFileTransferFactoryStub:any = null;
	var cellManagerStub:any = new events.EventEmitter();
	var middleware:Middleware = null;

	var connectEmitter:events.EventEmitter = new events.EventEmitter();

	var terminateCircuit = function (circuitId:string) {
		cellManagerStub.emit('tornDownCell', circuitId);
	};

	var terminateSocket = function (socketIdentifier:string) {
		protocolConnectionManagerStub.emit('terminatedConnection', socketIdentifier);
	};

	var connectionResponse = function (ip, port, success) {
		connectEmitter.emit(ip + '_' + port, success);
	}

	it('should correctly initialize the middleware', function () {
		middleware = new Middleware(cellManagerStub, protocolConnectionManagerStub, hydraMessageCenterStub, writableFileTransferFactoryStub);
		middleware.should.be.instanceof(Middleware);
	});

	it('should correctly feed a node within a list of nodes', function (done) {
		var nodes = [
			{
				ip: '1',
				port: 80,
				feedingIdentifier: 'foobar'
			},
			{
				ip: '2',
				port: 80,
				feedingIdentifier: 'foobar2'
			},
			{
				ip: '3',
				port: 80,
				feedingIdentifier: 'foobar3'
			},
			{
				ip: '4',
				port: 80,
				feedingIdentifier: 'foobar4'
			}
		];

		connectEmitter.on('obtaining', (port, ip) => {

			if (ip === '1') {
				connectionResponse(ip, port, true);
			}
			else {
				connectionResponse(ip, port, false);
			}
		});

		connectEmitter.once('msgSent', function (ident, buffer) {

			connectEmitter.removeAllListeners('obtaining');

			buffer.toString().should.equal('mumu');

			middleware.getOutgoingList()['circ1_1_80_foobar'].should.equal(ident);
			done();
		});

		middleware.feedNode(nodes, 'circ1', new Buffer('mumu'));

	});

	it('should feed an existing socket if possible', function (done) {
		var nodes = [
			{
				ip: '1',
				port: 80,
				feedingIdentifier: 'foobar'
			},
			{
				ip: '2',
				port: 80,
				feedingIdentifier: 'foobar2'
			},
			{
				ip: '3',
				port: 80,
				feedingIdentifier: 'foobar3'
			},
			{
				ip: '4',
				port: 80,
				feedingIdentifier: 'foobar4'
			}
		];

		var existingSocketIdentifier:string = middleware.getOutgoingList()['circ1_1_80_foobar'];

		connectEmitter.once('msgSent', function (ident, buffer) {
			ident.should.equal(existingSocketIdentifier);
			buffer.toString().should.equal('foo');
			done();
		});

		middleware.feedNode(nodes, 'circ1', new Buffer('foo'));
	});

	it('should close & remove the outgoing socket from the list if the underlying circuit is torn down', function () {
		openSockets.length.should.equal(1);

		cellManagerStub.emit('tornDownCell', 'circ1');

		Object.keys(middleware.getOutgoingList()).length.should.equal(0);
		openSockets.length.should.equal(0);
	});

	it('should assign an incoming socket to a specific circuit', function () {
		openSockets.push('foobar');
		middleware.addIncomingSocket('circ2', 'foobar');

		middleware.getIncomingList()['circ2'][0].should.equal('foobar');
	});

	it('should close & remove the incoming socket from the list if the underlygin circuit is torn down', function () {
		openSockets.length.should.equal(1);

		cellManagerStub.emit('tornDownCell', 'circ2');

		(middleware.getIncomingList()['circ2'] === undefined).should.be.true;

		openSockets.length.should.equal(0);
	});

	it('should correctly externally close a socket', function () {
		openSockets.push('foobar1');

		middleware.closeSocketByIdentifier('foobar1');

		openSockets.length.should.equal(0);
	});

	it('should remove the correct outgoing socket from the list of the underlying socket closes', function (done) {
		var nodes = [
			{
				ip: '4',
				port: 80,
				feedingIdentifier: 'foobar4'
			}
		];

		connectEmitter.once('obtaining', (port, ip) => {
			connectionResponse(ip, port, true);
		});

		connectEmitter.once('msgSent', function (ident, buffer) {
			ident.should.equal(middleware.getOutgoingList()['circ3_4_80_foobar4']);
			buffer.toString().should.equal('foo');

			protocolConnectionManagerStub.emit('terminatedConnection', ident);

			setImmediate(function () {
				(middleware.getOutgoingList()['circ3_4_80_foobar4'] === undefined).should.be.true;
				done();
			});


		});

		middleware.feedNode(nodes, 'circ3', new Buffer('foo'));
	});

	before(function () {
		sandbox = sinon.sandbox.create();

		protocolConnectionManagerStub = new events.EventEmitter();

		protocolConnectionManagerStub.hydraConnectTo = function (port:number, ip:string, cb:(err:Error, identifier:string) => any) {
			connectEmitter.once(ip + '_' + port, (success:boolean) => {
				var ident = null;
				var err = null;

				if (success) {
					ident = 'socket' + ++socketCount;
					openSockets.push(ident);
				}
				else {
					err = new Error();
				}

				setImmediate(function () {
					cb(err, ident);
				});
			});
			connectEmitter.emit('obtaining', port, ip);
		};

		protocolConnectionManagerStub.closeHydraSocket = function (identifier) {
			var index = openSockets.indexOf(identifier);

			if (index >= 0) {
				openSockets.splice(index, 1);
			}
		}

		protocolConnectionManagerStub.hydraWriteMessageTo = function (ident, buffer) {

			connectEmitter.emit('msgSent', ident, buffer);
		}

		hydraMessageCenterStub = testUtils.stubPublicApi(sandbox, HydraMessageCenter, {
			wrapFileTransferMessage: function (buffer) {
				return buffer;
			}
		});

		writableFileTransferFactoryStub = testUtils.stubPublicApi(sandbox, WritableFileTransferMessageFactory, {
			constructMessage: function (a, b, payload) {
				return payload;
			}
		});
	});

	after(function () {
		sandbox.restore();
	});

});