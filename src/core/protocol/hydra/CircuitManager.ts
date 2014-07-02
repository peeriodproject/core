import events = require('events');

import CircuitManagerInterface = require('./interfaces/CircuitManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import HydraCircuitFactoryInterface = require('./interfaces/HydraCircuitFactoryInterface');
import HydraCircuitInterface = require('./interfaces/HydraCircuitInterface');
import HydraCircuitList = require('./interfaces/HydraCircuitList');
import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');

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
class CircuitManager extends events.EventEmitter implements CircuitManagerInterface {

	/**
	 * The hydra circuit factory instance
	 *
	 * @member {core.protocol.hydra.HydraCircuitFactoryInterface} core.protocol.hydra.CircuitManager~_circuitFactory
	 */
	private _circuitFactory:HydraCircuitFactoryInterface = null;

	/**
	 * List that stores created circuits that have not been torn down or fully extended themselves.
	 *
	 * @member {core.protocol.hydra.HydraCircuitList} core.protocol.hydra.CircuitManager~_circuitsUnderConstruction
	 */
	private _circuitsUnderConstruction:HydraCircuitList = [];

	/**
	 * Stores constructed circuits by their circuit Id.
	 *
	 * @member {Object} core.protocol.hydra.CircuitManager~_constructedCircuitsByCircuitId
	 */
	private _constructedCircuitsByCircuitId:{[circuitId:string]:HydraCircuitInterface} = {};

	/**
	 * The optimal number of production-ready circuits the CircuitManager should reach and maintain.
	 * Gets populated by the config.
	 *
	 * @member {number} core.protocol.hydra.CircuitManager~_desiredNumberOfCircuits
	 */
	private _desiredNumberOfCircuits:number = 0;

	/**
	 * The maximum number of relay nodes a circuit should have.
	 * Gets populated by the config.
	 *
	 * @member {number} core.protocol.hydra.CircuitManager~_maximumNumberOfRelayNodes
	 */
	private _maximumNumberOfRelayNodes:number = 0;

	/**
	 * The minimum number of relay nodes a circuit should have.
	 * Gets populated by the config.
	 *
	 * @member {number} core.protocol.hydra.CircuitManager~_minimumNumberOfRelayNodes
	 */
	private _minimumNumberOfRelayNodes:number = 0;

	/**
	 * List that stores fully constructed (and thus production-ready) functional hydra circuits.
	 *
	 * @member {core.protocol.hydra.HydraCircuitList} core.protocol.hydra.CircuitManager~_productionReadyCircuits
	 */
	private _productionReadyCircuits:HydraCircuitList = [];

	public constructor (hydraConfig:ConfigInterface, circuitFactory:HydraCircuitFactoryInterface) {
		super();

		this._circuitFactory = circuitFactory;
		this._minimumNumberOfRelayNodes = hydraConfig.get('hydra.minimumNumberOfRelayNodes');
		this._maximumNumberOfRelayNodes = hydraConfig.get('hydra.maximumNumberOfRelayNodes');
		this._desiredNumberOfCircuits = hydraConfig.get('hydra.desiredNumberOfCircuits');
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getProductionReadyCircuits ():HydraCircuitList {
		return this._productionReadyCircuits;
	}

	public getCircuitsUnderConstruction ():HydraCircuitList {
		return this._circuitsUnderConstruction;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public getReadyCircuits ():HydraCircuitList {
		return this._productionReadyCircuits;
	}

	public kickOff ():void {
		this._checkAndConstructCircuit();
	}

	public pipeFileTransferMessageThroughCircuit (circuitId:string, payload:Buffer):boolean {
		var circuit:HydraCircuitInterface = this._constructedCircuitsByCircuitId[circuitId];

		if (circuit) {
			circuit.sendFileMessage(payload);
			return true;

		}

		return false;
	}

	public pipeFileTransferMessageThroughAllCircuits (payload:Buffer, randomExitNode:boolean = false):boolean {
		var circuitLength:number = this._productionReadyCircuits.length;

		if (!circuitLength) {
			return false;
		}

		for (var i=0; i<circuitLength; i++) {
			var randNode:HydraNode = null;
			var circuit:HydraCircuitInterface = this._productionReadyCircuits[i];

			if (randomExitNode) {
				var circuitNodes:HydraNodeList = circuit.getCircuitNodes();
				randNode = circuitNodes[Math.floor(Math.random() * circuitNodes.length)];
			}

			circuit.sendFileMessage(payload, randNode);
		}
		return true;
	}

	public pipeFileTransferMessageThroughRandomCircuit (payload:Buffer):boolean {
		var circuitLength:number = this._productionReadyCircuits.length;

		if (!circuitLength) {
			return false;
		}

		var i:number = Math.floor(Math.random() * circuitLength);
		this._productionReadyCircuits[i].sendFileMessage(payload);

		return true;
	}

	public teardownCircuit (circuitId:string):void {
		var circuit:HydraCircuitInterface = this._constructedCircuitsByCircuitId[circuitId];

		if (circuit) {
			circuit.teardown();
		}
	}

	/**
	 * Returns `true` if another circuit must be constructed.
	 *
	 * @method core.protocol.hydra.CircuitManager~_additionalCircuitNeeded
	 * @returns {boolean}
	 */
	private _additionalCircuitNeeded ():boolean {
		return (this._circuitsUnderConstruction.length + this._productionReadyCircuits.length) < this._desiredNumberOfCircuits;
	}

	/**
	 * Checks if another circuit is needed and if yes, constructs it, binds the needed listeners to it and adds it
	 * to the under-construction list.
	 *
	 * @method core.protocol.hydra.CircuitManager~_checkAndConstructCircuit
	 */
	private _checkAndConstructCircuit ():void {
		if (this._additionalCircuitNeeded()) {
			var circuit:HydraCircuitInterface = this._circuitFactory.create(this._generateRelayNodeAmount());

			this._circuitsUnderConstruction.push(circuit);

			circuit.once('isTornDown', () => {
				this._onCircuitTeardown(circuit);
			});

			circuit.once('isConstructed', () => {
				this._onCircuitConstructed(circuit);
			});

			circuit.construct();

			setImmediate(() => {
				this._checkAndConstructCircuit();
			});
		}
	}

	/**
	 * Emits the current amount of production ready circuits.
	 *
	 * @method core.protocol.hydra.CircuitManager~_emitCircuitCount
	 */
	private _emitCircuitCount ():void {
		this.emit('circuitCount', this._productionReadyCircuits.length);
	}

	/**
	 * Generates a number between the minimum and maximum number of relay nodes a circuit can have (including edges).
	 *
	 * @method core.protocol.hydra.HydraCircuitManager~_generateRelayNodeAmount
	 */
	private _generateRelayNodeAmount ():number {

		return this._minimumNumberOfRelayNodes + Math.round(Math.random() * (this._maximumNumberOfRelayNodes - this._minimumNumberOfRelayNodes));
	}

	/**
	 * Iterates over a given array of HydraCircuits and removes the provided circuit.
	 *
	 * @method core.protocol.hydra.CircuitManager~_iterateOverListAndRemoveCircuit
	 *
	 * @param {core.protocol.hydra.HydraCircuitList} list The array to iterate over.
	 * @param {core.protocol.hydra.HydraCircuitInterface} circuit The circuit to look for in the array and to remove from it.
	 */
	private _iterateOverListAndRemoveCircuit (list:HydraCircuitList, circuit:HydraCircuitInterface):void {
		for (var i=0, l=list.length; i<l; i++) {
			if (list[i] === circuit) {

				list.splice(i, 1);

				break;
			}
		}
	}

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
	private _onCircuitConstructed (circuit:HydraCircuitInterface):void {

		this._iterateOverListAndRemoveCircuit(this._circuitsUnderConstruction, circuit);
		this._productionReadyCircuits.push(circuit);
		this._constructedCircuitsByCircuitId[circuit.getCircuitId()] = circuit;

		circuit.on('fileTransferMessage', (circuitId:string, payload:Buffer) => {
			this.emit('circuitReceivedTransferMessage', circuitId, payload);
		});

		this._emitCircuitCount();

		if (this._productionReadyCircuits.length === this._desiredNumberOfCircuits) {
			this.emit('desiredCircuitAmountReached');
		}
	}

	/**
	 * The method that gets called when a circuit has been torn down and is thus unusable.
	 * It is removed from the lists and the construction cycle is started again (check if one is needed, if yes, construct etc.)
	 *
	 * @method core.protocol.hydra.CircuitManager~_onCircuitTeardown
	 *
	 * @param {core.protocol.hydra.HydraCircuitInterface} circuit The circuit that has been torn down.
	 */
	private _onCircuitTeardown (circuit:HydraCircuitInterface):void {

		circuit.removeAllListeners('fileTransferMessage');

		this._iterateOverListAndRemoveCircuit(this._circuitsUnderConstruction, circuit);
		this._iterateOverListAndRemoveCircuit(this._productionReadyCircuits, circuit);

		delete this._constructedCircuitsByCircuitId[circuit.getCircuitId()];

		this._emitCircuitCount();

		this._checkAndConstructCircuit();
	}

}

export = CircuitManager;