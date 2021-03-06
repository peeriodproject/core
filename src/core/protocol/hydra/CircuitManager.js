var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
* CircuitManagerInterface implementation
*
* @class core.protocol.hydra.CircuitManager
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.CircuitManagerInterface
*
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration.
* @param {core.protocol.hydra.HydraCircuitFactoryInterface} circuitFactory A hydra circuit factory instance.
*/
var CircuitManager = (function (_super) {
    __extends(CircuitManager, _super);
    function CircuitManager(hydraConfig, circuitFactory) {
        _super.call(this);
        /**
        * The hydra circuit factory instance
        *
        * @member {core.protocol.hydra.HydraCircuitFactoryInterface} core.protocol.hydra.CircuitManager~_circuitFactory
        */
        this._circuitFactory = null;
        /**
        * List that stores created circuits that have not been torn down or fully extended themselves.
        *
        * @member {core.protocol.hydra.HydraCircuitList} core.protocol.hydra.CircuitManager~_circuitsUnderConstruction
        */
        this._circuitsUnderConstruction = [];
        /**
        * Stores constructed circuits by their circuit Id.
        *
        * @member {Object} core.protocol.hydra.CircuitManager~_constructedCircuitsByCircuitId
        */
        this._constructedCircuitsByCircuitId = {};
        /**
        * The optimal number of production-ready circuits the CircuitManager should reach and maintain.
        * Gets populated by the config.
        *
        * @member {number} core.protocol.hydra.CircuitManager~_desiredNumberOfCircuits
        */
        this._desiredNumberOfCircuits = 0;
        /**
        * The maximum number of relay nodes a circuit should have.
        * Gets populated by the config.
        *
        * @member {number} core.protocol.hydra.CircuitManager~_maximumNumberOfRelayNodes
        */
        this._maximumNumberOfRelayNodes = 0;
        /**
        * The minimum number of relay nodes a circuit should have.
        * Gets populated by the config.
        *
        * @member {number} core.protocol.hydra.CircuitManager~_minimumNumberOfRelayNodes
        */
        this._minimumNumberOfRelayNodes = 0;
        /**
        * List that stores fully constructed (and thus production-ready) functional hydra circuits.
        *
        * @member {core.protocol.hydra.HydraCircuitList} core.protocol.hydra.CircuitManager~_productionReadyCircuits
        */
        this._productionReadyCircuits = [];

        this._circuitFactory = circuitFactory;
        this._minimumNumberOfRelayNodes = hydraConfig.get('hydra.minimumNumberOfRelayNodes');
        this._maximumNumberOfRelayNodes = hydraConfig.get('hydra.maximumNumberOfRelayNodes');
        this._desiredNumberOfCircuits = hydraConfig.get('hydra.desiredNumberOfCircuits');
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    CircuitManager.prototype.getProductionReadyCircuits = function () {
        return this._productionReadyCircuits;
    };

    CircuitManager.prototype.getCircuitsUnderConstruction = function () {
        return this._circuitsUnderConstruction;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    CircuitManager.prototype.getDesiredNumberOfCircuits = function () {
        return this._desiredNumberOfCircuits;
    };

    CircuitManager.prototype.getRandomFeedingNodesBatch = function () {
        var nodes = [];
        var circuits = this.getReadyCircuits();

        for (var i = 0, l = circuits.length; i < l; i++) {
            var circuitNodes = circuits[i].getCircuitNodes();
            var randomNode = circuitNodes[Math.floor(Math.random() * circuitNodes.length)];

            if (randomNode) {
                nodes.push(randomNode);
            }
        }

        return nodes.length ? nodes : null;
    };

    CircuitManager.prototype.getReadyCircuits = function () {
        return this._productionReadyCircuits;
    };

    CircuitManager.prototype.kickOff = function () {
        this._checkAndConstructCircuit();
    };

    CircuitManager.prototype.pipeFileTransferMessageThroughCircuit = function (circuitId, payload) {
        var circuit = this._constructedCircuitsByCircuitId[circuitId];

        if (circuit) {
            circuit.sendFileMessage(payload);
            return true;
        }

        return false;
    };

    CircuitManager.prototype.pipeFileTransferMessageThroughAllCircuits = function (payload, randomExitNode) {
        if (typeof randomExitNode === "undefined") { randomExitNode = false; }
        var circuitLength = this._productionReadyCircuits.length;

        if (!circuitLength) {
            return false;
        }

        for (var i = 0; i < circuitLength; i++) {
            var randNode = null;
            var circuit = this._productionReadyCircuits[i];

            if (randomExitNode) {
                var circuitNodes = circuit.getCircuitNodes();
                randNode = circuitNodes[Math.floor(Math.random() * circuitNodes.length)];
            }

            circuit.sendFileMessage(payload, randNode);
        }
        return true;
    };

    CircuitManager.prototype.pipeFileTransferMessageThroughRandomCircuit = function (payload) {
        var circuitLength = this._productionReadyCircuits.length;

        if (!circuitLength) {
            return false;
        }

        var i = Math.floor(Math.random() * circuitLength);
        this._productionReadyCircuits[i].sendFileMessage(payload);

        return true;
    };

    CircuitManager.prototype.teardownCircuit = function (circuitId) {
        var circuit = this._constructedCircuitsByCircuitId[circuitId];

        if (circuit) {
            circuit.teardown();
        }
    };

    /**
    * Returns `true` if another circuit must be constructed.
    *
    * @method core.protocol.hydra.CircuitManager~_additionalCircuitNeeded
    * @returns {boolean}
    */
    CircuitManager.prototype._additionalCircuitNeeded = function () {
        logger.log('hydraExtension', 'Checking if new circuit is needed', { underConstruction: this._circuitsUnderConstruction.length, ready: this._productionReadyCircuits.length, desired: this._desiredNumberOfCircuits });
        return (this._circuitsUnderConstruction.length + this._productionReadyCircuits.length) < this._desiredNumberOfCircuits;
    };

    /**
    * Checks if another circuit is needed and if yes, constructs it, binds the needed listeners to it and adds it
    * to the under-construction list.
    *
    * @method core.protocol.hydra.CircuitManager~_checkAndConstructCircuit
    */
    CircuitManager.prototype._checkAndConstructCircuit = function () {
        var _this = this;
        if (this._additionalCircuitNeeded()) {
            logger.log('hydraExtension', 'Constructing new circuit', { readLen: this._productionReadyCircuits.length });

            var circuit = this._circuitFactory.create(this._generateRelayNodeAmount());

            this._circuitsUnderConstruction.push(circuit);

            circuit.once('isTornDown', function () {
                logger.log('hydraExtension', 'Circuit was torn down', { circuitId: circuit.getCircuitId(), numOfCircs: _this._productionReadyCircuits.length });

                _this._onCircuitTeardown(circuit);
            });

            circuit.once('isConstructed', function () {
                logger.log('hydraExtension', 'Fully constructed circuit', { circuitId: circuit.getCircuitId(), numOfNodes: circuit.getCircuitNodes().length, numOfCircs: _this._productionReadyCircuits.length });

                _this._onCircuitConstructed(circuit);
            });

            circuit.construct();

            setImmediate(function () {
                _this._checkAndConstructCircuit();
            });
        }
    };

    /**
    * Emits the current amount of production ready circuits.
    *
    * @method core.protocol.hydra.CircuitManager~_emitCircuitCount
    */
    CircuitManager.prototype._emitCircuitCount = function () {
        this.emit('circuitCount', this._productionReadyCircuits.length);
    };

    /**
    * Generates a number between the minimum and maximum number of relay nodes a circuit can have (including edges).
    *
    * @method core.protocol.hydra.HydraCircuitManager~_generateRelayNodeAmount
    */
    CircuitManager.prototype._generateRelayNodeAmount = function () {
        return this._minimumNumberOfRelayNodes + Math.round(Math.random() * (this._maximumNumberOfRelayNodes - this._minimumNumberOfRelayNodes));
    };

    /**
    * Iterates over a given array of HydraCircuits and removes the provided circuit.
    *
    * @method core.protocol.hydra.CircuitManager~_iterateOverListAndRemoveCircuit
    *
    * @param {core.protocol.hydra.HydraCircuitList} list The array to iterate over.
    * @param {core.protocol.hydra.HydraCircuitInterface} circuit The circuit to look for in the array and to remove from it.
    * @returns {boolean} `true` If one was found and removed, `false` if no match to remove was found
    */
    CircuitManager.prototype._iterateOverListAndRemoveCircuit = function (list, circuit) {
        var matched = false;

        for (var i = 0, l = list.length; i < l; i++) {
            if (list[i] === circuit) {
                list.splice(i, 1);
                matched = true;

                break;
            }
        }

        return matched;
    };

    /**
    * The method that gets called when a circuit has been fully extended to its desired length.
    * Moves the circuit from the under-construction list to the production-ready list.
    * If the number of the production-ready list equals the number of desired circuits, the
    * 'desiredCircuitAmountReached' event is emitted.
    *
    * @method core.protocol.hydra.CircuitManager~_onCircuitConstructed
    *
    * @param {core.protocol.hydra.HydraCircuitInterface} circuit The constructed circuit.
    */
    CircuitManager.prototype._onCircuitConstructed = function (circuit) {
        var _this = this;
        this._iterateOverListAndRemoveCircuit(this._circuitsUnderConstruction, circuit);
        this._productionReadyCircuits.push(circuit);
        this._constructedCircuitsByCircuitId[circuit.getCircuitId()] = circuit;

        circuit.on('fileTransferMessage', function (circuitId, payload) {
            _this.emit('circuitReceivedTransferMessage', circuitId, payload);
        });

        this._emitCircuitCount();

        if (this._productionReadyCircuits.length === this._desiredNumberOfCircuits) {
            this.emit('desiredCircuitAmountReached');
        }

        this._checkAndConstructCircuit();
    };

    /**
    * The method that gets called when a circuit has been torn down and is thus unusable.
    * It is removed from the lists and the construction cycle is started again (check if one is needed, if yes, construct etc.)
    *
    * @method core.protocol.hydra.CircuitManager~_onCircuitTeardown
    *
    * @param {core.protocol.hydra.HydraCircuitInterface} circuit The circuit that has been torn down.
    */
    CircuitManager.prototype._onCircuitTeardown = function (circuit) {
        circuit.removeAllListeners('fileTransferMessage');

        this._iterateOverListAndRemoveCircuit(this._circuitsUnderConstruction, circuit);
        var emit = this._iterateOverListAndRemoveCircuit(this._productionReadyCircuits, circuit);

        delete this._constructedCircuitsByCircuitId[circuit.getCircuitId()];

        if (emit) {
            this._emitCircuitCount();
        }

        this._checkAndConstructCircuit();
    };
    return CircuitManager;
})(events.EventEmitter);

module.exports = CircuitManager;
//# sourceMappingURL=CircuitManager.js.map
