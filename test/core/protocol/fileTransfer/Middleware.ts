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
	var cellManagerStub:any = null;
	var middleware:Middleware = null;

	var connectEmitter:events.EventEmitter = new events.EventEmitter();

	before(function () {
		sandbox = sinon.sandbox.create();

		protocolConnectionManagerStub = new events.EventEmitter();

		protocolConnectionManagerStub.hydraConnectTo = function (port:number, ip:string, cb:(err:Error, identifier:string) => any) {
			connectEmitter.emit('obtaining', port, ip);
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
		};

		protocolConnectionManagerStub.closeHydraSocket = function (identifier) {
			var index = openSockets.indexOf(identifier);

			if (index >= 0) {
				openSockets.splice(index, 1);
			}
		}
	});

	after(function () {
		sandbox.restore();
	});

});