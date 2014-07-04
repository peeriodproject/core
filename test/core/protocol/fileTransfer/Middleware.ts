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

	before(function () {
		sandbox = sinon.sandbox.create();

		protocolConnectionManagerStub = new events.EventEmitter();

		protocolConnectionManagerStub.hydraConnectTo = function (port:number, ip:string, cb:(err:Error, identifier:string) => any) {
			connectEmitter.once(ip + '_' + port, (success:boolean) => {
				var ident = null;
				var err = null;

				if (success) {
					ident = 'socket' + ++socketCount;
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