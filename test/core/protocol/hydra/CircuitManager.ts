/// <reference path='../../../test.d.ts' />

require('should');

import events = require('events');
import crypto = require('crypto');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import ObjectConfig = require('../../../../src/core/config/ObjectConfig');

import HydraCircuit = require('../../../../src/core/protocol/hydra/HydraCircuit');
import HydraCircuitList = require('../../../../src/core/protocol/hydra/interfaces/HydraCircuitList');
import CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
import HydraCircuitFactory = require('../../../../src/core/protocol/hydra/HydraCircuitFactory');

describe('CORE --> PROTOCOL --> HYDRA --> CircuitManager', function () {

	var minNodes = 3;
	var maxNodes = 7;
	var desiredNumOfCircs = 4;

	var sandbox:SinonSandbox = null;
	var circuitFactoryStub:any = null;
	var configStub:any = null;

	var circuitManager:CircuitManager = null;

	before(function () {
		sandbox = sinon.sandbox.create();

		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'hydra.minimumNumberOfRelayNodes') return minNodes;
				if (what === 'hydra.maximumNumberOfRelayNodes') return maxNodes;
				if (what === 'hydra.desiredNumberOfCircuits') return desiredNumOfCircs;
			}
		});

		circuitFactoryStub = testUtils.stubPublicApi(sandbox, HydraCircuitFactory, {
			create: function (relayNodeAmount:number) {
				var circuit:any = new events.EventEmitter;

				circuit.relayNodeAmount = relayNodeAmount;
				circuit.toEmit = Math.random() < 0.5 ? 'isTornDown' : 'isConstructed';
				circuit.circuitId = null;
				circuit.getCircuitId = function () {
					return circuit.circuitId;
				}

				circuit.getCircuitNodes = function () {
					return [];
				}

				circuit.construct = function () {
					setImmediate(() => {
						if (this.toEmit === 'isConstructed') {
							circuit.circuitId = crypto.pseudoRandomBytes(16).toString('hex');
						}
						this.emit(this.toEmit);
					});
				}

				return circuit;
			}
		})
	});

	it('should construct circuits until it has reached the desired number', function (done) {
		circuitManager = new CircuitManager(configStub, circuitFactoryStub);

		circuitManager.kickOff();

		circuitManager.once('desiredCircuitAmountReached', function () {

			var production = circuitManager.getProductionReadyCircuits();

			production.length.should.equal(desiredNumOfCircs);
			for (var i=0; i<production.length; i++) {
				var circuit:any = production[i];
				circuit.relayNodeAmount.should.be.below(maxNodes + 1);
				circuit.relayNodeAmount.should.be.above(minNodes - 1);
			}

			circuitManager.getCircuitsUnderConstruction().length.should.equal(0);

			done();

		});
	});

	it('should reconstruct circuits until it has reached the desired number', function (done) {
		var productionReady = circuitManager.getProductionReadyCircuits();
		var readyCopy = [];

		for (var i=0; i<productionReady.length; i++) {
			readyCopy.push(productionReady[i]);
		}

		for (var i=0; i<productionReady.length; i++) {
			if (i < 2) {
				productionReady[i].emit('isTornDown');
			}
		}

		circuitManager.on('desiredCircuitAmountReached', function () {
			var production = circuitManager.getProductionReadyCircuits();

			production.length.should.equal(desiredNumOfCircs);
			for (var i=0; i<production.length; i++) {
				var circuit:any = production[i];
				circuit.relayNodeAmount.should.be.below(maxNodes + 1);
				circuit.relayNodeAmount.should.be.above(minNodes - 1);
			}

			circuitManager.getCircuitsUnderConstruction().length.should.equal(0);

			var identicalCount = 0;
			for (var i = 0; i<production.length; i++) {
				for (var j=0; j<readyCopy.length; j++) {
					if (production[i] === readyCopy[j]) {
						identicalCount++;
						break;
					}

				}
			}

			identicalCount.should.equal(2);

			done();
		});
	});

	it('should return a random batch of feeding nodes', function () {

		(<any> circuitManager).__getReadyCircuits = circuitManager.getReadyCircuits();

		circuitManager.getReadyCircuits = function () {
			return [
				testUtils.stubPublicApi(sandbox, HydraCircuit, {
					getCircuitNodes: function () {
						return [{checker: 'foo1'}, {checker: 'foo2'}];
					}
				}),
				testUtils.stubPublicApi(sandbox, HydraCircuit, {
					getCircuitNodes: function () {
						return [{checker: 'bar1'}, {checker: 'bar2'}];
					}
				})
			];
		};

		var list:any = circuitManager.getRandomFeedingNodesBatch();

		['foo1', 'foo2'].should.containEql(list[0].checker);
		['bar1', 'bar2'].should.containEql(list[1].checker);

		circuitManager.getReadyCircuits = (<any> circuitManager).__getReadyCircuits;
	});

	after(function () {
		sandbox.restore();
	});

});