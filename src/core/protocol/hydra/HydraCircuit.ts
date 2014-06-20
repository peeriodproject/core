import events = require('events');

import HydraCircuitInterface = require('./interfaces/HydraCircuitInterface');
import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import NodePickerInterface = require('./interfaces/NodePickerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');
import LayeredEncDecHandlerFactoryInterface = require('./messages/interfaces/LayeredEncDecHandlerFactoryInterface');
import CircuitExtenderInterface = require('./interfaces/CircuitExtenderInterface');
import CircuitExtenderFactoryInterface = require('./interfaces/CircuitExtenderFactoryInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');

class HydraCircuit extends events.EventEmitter implements HydraCircuitInterface {

	private _numOfRelayNodes:number = 0;

	private _nodePicker:NodePickerInterface = null;

	private _messageCenter:HydraMessageCenterInterface = null;

	private _connectionManager:ConnectionManagerInterface = null;

	private _maximumExtensionRetries:number = 0;

	private _circuitExtender:CircuitExtenderInterface = null;

	private _constructed:boolean = false;

	private _isTornDown:boolean = false;

	private _nodesToExtendWith:HydraNodeList = null;

	private _extensionRetryCount:number = 0;

	private _circuitId:string = null;

	private _layeredEncDecHandler:LayeredEncDecHandlerInterface = null;

	private _circuitNodes:HydraNodeList;

	private _terminationListener:Function = null;

	private _digestListener:Function = null;

	public constructor (hydraConfig:ConfigInterface, numOfRelayNodes:number, nodePicker:NodePickerInterface, messageCenter:HydraMessageCenterInterface, connectionManager:ConnectionManagerInterface, layeredEncDecFactory:LayeredEncDecHandlerFactoryInterface, circuitExtenderFactory:CircuitExtenderFactoryInterface) {
		super();

		this._numOfRelayNodes = numOfRelayNodes;
		this._nodePicker = nodePicker;
		this._messageCenter = messageCenter;
		this._connectionManager = connectionManager;
		this._layeredEncDecHandler = layeredEncDecFactory.create();
		this._circuitNodes = this._layeredEncDecHandler.getNodes();
		this._circuitExtender = circuitExtenderFactory.create(hydraConfig.get('hydra.circuit.extensionReactionTimeBaseInSeconds') * 1000, hydraConfig.get('hydra.circuit.extensionReactionTimeFactor'), this._layeredEncDecHandler);
		this._maximumExtensionRetries = hydraConfig.get('hydra.circuit.maximumExtensionRetries');

		this._construct();
	}

	private _construct ():void {
		this._nodePicker.pickRelayNodeBatch((batch:HydraNodeList) => {
			this._nodesToExtendWith = batch;

			this._extensionCycle();
		});
	}

	private _extensionCycle (retryNode?:HydraNode):void {
		if (retryNode) {
			this._extensionRetryCount++;
		}

		var nodeToExtendWith:HydraNode = retryNode ? retryNode : this._nodesToExtendWith.shift();

		this._nodePicker.pickNextAdditiveNodeBatch((batch:HydraNodeList) => {
			this._circuitExtender.extend(nodeToExtendWith, batch, (err:Error, isRejected:boolean, newNode:HydraNode) => {
				// successful
				if (newNode) {
					this._extensionRetryCount = 0;

					var circuitNodesLength:number = this._circuitNodes.length;

					if (circuitNodesLength === 1) {
						// the first node, setup the listeners
						this._setupListeners();
					}

					if (circuitNodesLength === this._numOfRelayNodes) {
						// all done, finalize
						this._constructed = true;
						this.emit('isConstructed');
					}
					else {
						this._extensionCycle();
					}
				}
				// successful, but rejected
				else if (isRejected) {
					if (this._extensionRetryCount === this._maximumExtensionRetries) {
						this._teardown(true);
					}
					else {
						this._nodePicker.pickAdditionalRelayNode((node:HydraNode) => {
							this._extensionCycle(node);
						});
					}
				}
				// error. tear down shit
				else if (err) {
					this._teardown(err.message.indexOf('Circuit socket terminated') === -1);
				}

			});
		});

	}

	private _setupListeners ():void {

		this._circuitId = this._circuitNodes[0].circuitId;

		if (!this._circuitId) {
			throw new Error('Node does not have a circuit ID. This may never ever happen, yo! Something went very very wrong');
		}

		this._terminationListener = (circuitId:string) => {
			if (circuitId === this._circuitId) {
				this._teardown(false);
			}
		}

		this._digestListener = (from:HydraNode, msg:ReadableHydraMessageInterface) => {
			this._onEncryptedDigest(from, msg);
		}

		this._connectionManager.on('circuitTermination', this._terminationListener);
		this._messageCenter.on('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);
	}

	private _onEncryptedDigest (from:HydraNode, message:ReadableHydraMessageInterface) {
		if (from === this._circuitNodes[0]) {
			this._layeredEncDecHandler.decrypt(message.getPayload(), (err:Error, decryptedBuffer:Buffer) => {
				if (err) {
					this._teardown(true);
				}
				else if (decryptedBuffer) {
					this._messageCenter.forceCircuitMessageThrough(decryptedBuffer, from);
				}
			});
		}
	}

	private _removeEventListeners ():void {
		this._connectionManager.removeListener('circuitTermination', this._terminationListener);
		this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);
	}

	private _teardown (closeSocket:boolean) {
		if (!this._isTornDown) {
			this._isTornDown = true;

			this._removeEventListeners();

			if (closeSocket && this._circuitNodes.length) {
				this._connectionManager.removeFromCircuitNodes(this._circuitNodes[0]);
			}

			this.emit('isTornDown');
		}
	}

}

export = HydraCircuit;