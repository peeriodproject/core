/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');
var crypto = require('crypto');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

var CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
var HydraCircuitFactory = require('../../../../src/core/protocol/hydra/HydraCircuitFactory');

describe('CORE --> PROTOCOL --> HYDRA --> CircuitManager', function () {
    var minNodes = 3;
    var maxNodes = 7;
    var desiredNumOfCircs = 4;

    var sandbox = null;
    var circuitFactoryStub = null;
    var configStub = null;

    var circuitManager = null;

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'hydra.minimumNumberOfRelayNodes')
                    return minNodes;
                if (what === 'hydra.maximumNumberOfRelayNodes')
                    return maxNodes;
                if (what === 'hydra.desiredNumberOfCircuits')
                    return desiredNumOfCircs;
            }
        });

        circuitFactoryStub = testUtils.stubPublicApi(sandbox, HydraCircuitFactory, {
            create: function (relayNodeAmount) {
                var circuit = new events.EventEmitter;

                circuit.relayNodeAmount = relayNodeAmount;
                circuit.toEmit = Math.random() < 0.5 ? 'isTornDown' : 'isConstructed';
                circuit.circuitId = null;
                circuit.getCircuitId = function () {
                    return circuit.circuitId;
                };

                circuit.construct = function () {
                    var _this = this;
                    setImmediate(function () {
                        if (_this.toEmit === 'isConstructed') {
                            circuit.circuitId = crypto.pseudoRandomBytes(16).toString('hex');
                        }
                        _this.emit(_this.toEmit);
                    });
                };

                return circuit;
            }
        });
    });

    it('should construct circuits until it has reached the desired number', function (done) {
        circuitManager = new CircuitManager(configStub, circuitFactoryStub);

        circuitManager.kickOff();

        circuitManager.once('desiredCircuitAmountReached', function () {
            var production = circuitManager.getProductionReadyCircuits();

            production.length.should.equal(desiredNumOfCircs);
            for (var i = 0; i < production.length; i++) {
                var circuit = production[i];
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

        for (var i = 0; i < productionReady.length; i++) {
            readyCopy.push(productionReady[i]);
        }

        for (var i = 0; i < productionReady.length; i++) {
            if (i < 2) {
                productionReady[i].emit('isTornDown');
            }
        }

        circuitManager.on('desiredCircuitAmountReached', function () {
            var production = circuitManager.getProductionReadyCircuits();

            production.length.should.equal(desiredNumOfCircs);
            for (var i = 0; i < production.length; i++) {
                var circuit = production[i];
                circuit.relayNodeAmount.should.be.below(maxNodes + 1);
                circuit.relayNodeAmount.should.be.above(minNodes - 1);
            }

            circuitManager.getCircuitsUnderConstruction().length.should.equal(0);

            var identicalCount = 0;
            for (var i = 0; i < production.length; i++) {
                for (var j = 0; j < readyCopy.length; j++) {
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

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=CircuitManager.js.map
