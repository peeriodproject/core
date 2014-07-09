/// <reference path='../../../test.d.ts' />

require('should');

import crypto = require('crypto');
import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import ObjectConfig = require('../../../../src/core/config/ObjectConfig');

import HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
import ConnectionManager = require('../../../../src/core/protocol/hydra/ConnectionManager');

import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import HydraNodeList = require('../../../../src/core/protocol/hydra/interfaces/HydraNodeList');
import CircuitExtender = require('../../../../src/core/protocol/hydra/CircuitExtender');
import CircuitExtenderFactory = require('../../../../src/core/protocol/hydra/CircuitExtenderFactory');
import NodePicker = require('../../../../src/core/protocol/hydra/NodePicker');
import HydraCircuit = require('../../../../src/core/protocol/hydra/HydraCircuit');

import ReadableHydraMessage = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessage');

import LayeredEncDecHandler = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandler');

import LayeredEncDecHandlerFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandlerFactory');

describe('CORE --> PROTOCOL --> HYDRA --> HydraCircuit', function () {

	var sandbox:SinonSandbox = null;

	var circuit:HydraCircuit = null;

	var extendEmitter:events.EventEmitter = new events.EventEmitter();

	// STUBS
	var configStub:any = null;
	var circuitExtenderFactoryStub:any = null;
	var messageCenterStub:any = null;
	var connectionManagerStub:any = null;

	var relayNodes:HydraNodeList = null;
	var additiveNodes:HydraNodeList = [{ip:'1.1.1.1', port:80}];

	var terminate:Function = null;
	var digest:Function = null;

	var digestCount = 0;

	// HELPER FUNCTIONS
	var messageForcedThrough:string = null;

	var currentNodeToExtendWith = null;

	var createNodePickerStub = function () {
		return testUtils.stubPublicApi(sandbox, NodePicker, {
			pickAdditionalRelayNode: function (cb) {
				cb({ip: '2.2.2.2', port: 80});
			},
			pickNextAdditiveNodeBatch: function (cb) {
				cb(additiveNodes);
			},
			pickRelayNodeBatch: function (cb) {
				cb([
					{
						ip: 'a'
					},
					{
						ip: 'b'
					},
					{
						ip: 'c'
					}
				]);
			}
		});
	};

	var createCircuit = function () {
		return new HydraCircuit(configStub, 3, createNodePickerStub(), messageCenterStub, connectionManagerStub, new LayeredEncDecHandlerFactory(), circuitExtenderFactoryStub);
	}

	var reject = function () {
		extendEmitter.emit('answer', null, true, null);
	};
	var accept = function () {
		currentNodeToExtendWith.circuitId = 'cafebabecafebabecafebabecafebabe';
		var key = crypto.pseudoRandomBytes(16);
		currentNodeToExtendWith.incomingKey = key;
		currentNodeToExtendWith.outgoingKey = key;

		circuit.getLayeredEncDec().addNode(currentNodeToExtendWith);

		setImmediate(function () {
			extendEmitter.emit('answer', null, false, currentNodeToExtendWith);
		});
	};
	var errorWithTermination = function () {
		setImmediate(function () {
			extendEmitter.emit('answer', new Error('Circuit socket terminated'), false, null);
		});
	};
	var errorOut = function () {
		setImmediate(function () {
			extendEmitter.emit('answer', new Error('Foobar'), false, null);
		});
	}

	//---------------------------------------
	it('should correctly initialize a HydraCircuit instance', function () {
		circuit = createCircuit();
		circuit.should.be.instanceOf(HydraCircuit);
	});

	it('should manage to fully construct a circuit', function (done) {

		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				accept();

				extendEmitter.once('extending', function () {
					accept();
				});
			});
		});

		circuit.on('isConstructed', function () {
			circuit.getCircuitNodes().length.should.equal(3);
			circuit.getCircuitId().should.equal('cafebabecafebabecafebabecafebabe');
			done();
		});
		circuit.construct();
	});

	it('should handle a rejection and successfully retry', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				reject();

				extendEmitter.once('extending', function () {
					accept();

					extendEmitter.once('extending', function () {
						accept();
					});
				});
			});
		});

		circuit.on('isConstructed', done);
		circuit.construct();
	});

	it('should teardown the circuit on too many rejections and close the socket', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				digestCount.should.equal(3);
				reject();

				extendEmitter.once('extending', function () {
					reject();

				});
			});
		});

		circuit.on('isTornDown', function () {
			circuit.alsoClosedSocket.should.be.true;
			digestCount.should.equal(2);
			done();
		});

		circuit.construct();
	});

	it('should teardown the circuit on too many rejections and not close the socket', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			reject();

			extendEmitter.once('extending', function () {
				reject();

			});
		});

		circuit.on('isTornDown', function () {
			digestCount.should.equal(2);
			circuit.alsoClosedSocket.should.be.false;
			done();
		});

		circuit.construct();
	});

	it('should teardown the circuit on a regular error and close the socket', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				errorOut();

			});
		});

		circuit.on('isTornDown', function () {
			circuit.alsoClosedSocket.should.be.true;
			done();
		});

		circuit.construct();
	});

	it('should teardown the circuit on a regular error and not close the socket', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			errorOut();
		});

		circuit.on('isTornDown', function () {
			circuit.alsoClosedSocket.should.be.false;
			done();
		});

		circuit.construct();
	});

	it('should teardown the circuit on a circuit termination error and not close the socket', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				errorWithTermination()

			});
		});

		circuit.on('isTornDown', function () {
			circuit.alsoClosedSocket.should.be.false;
			done();
		});

		circuit.construct();
	});

	it('should construct a circuit but tear it down on circuit termination', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				accept();

				extendEmitter.once('extending', function () {
					accept();
				});
			});
		});

		circuit.on('isConstructed', function () {
			digestCount.should.equal(3);

			circuit.on('isTornDown', function () {
				digestCount.should.equal(2);
				done();
			});

			terminate('cafebabecafebabecafebabecafebabe');
		});
		circuit.construct();
	});

	it('should force a decrypted circuit message through', function (done) {
		circuit = createCircuit();

		extendEmitter.once('extending', function () {
			accept();

			extendEmitter.once('extending', function () {
				accept();

				extendEmitter.once('extending', function () {
					accept();
				});
			});
		});

		circuit.on('isConstructed', function () {
			var cleartext:Buffer = new Buffer('Deine mudda stinkt nach fisch.');
			var from = circuit.getLayeredEncDec().getNodes()[0];

			circuit.getLayeredEncDec().encrypt(cleartext, null, function (err, buff) {
				digest(from, testUtils.stubPublicApi(sandbox, ReadableHydraMessage, {
					getPayload: function () {
						return buff;
					}
				}));

				setTimeout(function () {
					messageForcedThrough.should.equal('Deine mudda stinkt nach fisch.');
					done();
				}, 100);
			});

		});
		circuit.construct();
	});


	before(function () {
		sandbox = sinon.sandbox.create();

		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'hydra.circuit.extensionReactionTimeBaseInSeconds') return 1;
				if (what === 'hydra.circuit.extensionReactionTimeFactor') return 1.1;
				if (what === 'hydra.circuit.maximumExtensionRetries') return 1;
			}
		});

		circuitExtenderFactoryStub = testUtils.stubPublicApi(sandbox, CircuitExtenderFactory, {
			create: function () {
				return testUtils.stubPublicApi(sandbox, CircuitExtender, {
					extend: function (nodeToExtendWith, batch, callback) {
						currentNodeToExtendWith = nodeToExtendWith;

						setImmediate(function () {
							extendEmitter.emit('extending');
						});

						extendEmitter.once('answer', callback);
					}
				});
			}
		});

		connectionManagerStub = testUtils.stubPublicApi(sandbox, ConnectionManager, {
			on: function (what, callback) {
				if (what === 'circuitTermination') terminate = callback;
			}
		});
		messageCenterStub = testUtils.stubPublicApi(sandbox, HydraMessageCenter, {
			forceCircuitMessageThrough: function (buffer) {
				messageForcedThrough = buffer.toString();
			},
			on: function (what, callback) {
				if (what === 'ENCRYPTED_DIGEST_cafebabecafebabecafebabecafebabe') {
					digestCount++;
					digest = callback;
				}
			},
			removeListener: function (what, func) {
				if (what === 'ENCRYPTED_DIGEST_cafebabecafebabecafebabecafebabe') {

					if (func === digest) {
						digestCount--;
					}
				}
			}
		});

	});

	after(function () {
		sandbox.restore();
	});


});