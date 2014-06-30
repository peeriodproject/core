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

/**
 * HydraCircuitInterface implementation
 *
 * @class core.protocol.hydra.HydraCircuit
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.hydra.HydraCircuitInterface
 *
 * @param {core.config.ConfigInterface} hydraConfig Hydra configuration
 * @param {number} numOfRelayNodes The number of desired circuit nodes this circuit should expand to.
 * @param {core.protocol.hydra.NodePickerInterface} nodePicker A usable NodePicker instance with similar configuration.
 * @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter A working message center instance.
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
 * @param {core.protocol.hydra.LayeredEncDecHandlerFactoryInterface} layeredEncDecFactory A factory for creating a fresh layered encryption/decryption handler (corresponding construction)
 * @param {core.protocol.hydra.CircuitExtenderFactoryInterface} circuitExtenderFactory A circuit extender factory (correspoding construction)
 */
class HydraCircuit extends events.EventEmitter implements HydraCircuitInterface {

	/**
	 * Stores this instance's circuit extender.
	 *
	 * @member {core.protocol.hydra.CircuitExtenderInterface} core.protocol.hydra.HydraCircuit~_circuitExtender
	 */
	private _circuitExtender:CircuitExtenderInterface = null;

	/**
	 * Stores this circuit's circuit ID shared with the first node. Gets populated once the first extension has been
	 * completed.
	 *
	 * @member {string} core.protocol.hydra.HydraCircuit~_circuitId
	 */
	private _circuitId:string = null;

	/**
	 * Stores this circuit's relay nodes. References the same array as the node array of the layered enc/dec handler
	 *
	 * @member {core.protocol.hydra.HydraNodeList} core.protocol.hydra.HydraCircuit~_circuitNodes
	 */
	private _circuitNodes:HydraNodeList;

	/**
	 * The working connection manager instance.
	 *
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCircuit~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * Flag indicating whether the circuit has been fully constructed, i.e. the number of active relay nodes equals
	 * the number of desired relay nodes.
	 *
	 * @member {boolean} core.protocol.hydra.HydraCircuit~_constructed
	 */
	private _constructed:boolean = false;

	/**
	 * Stores the listener function on the ENCRYPTED_DIGEST event emitted by the message center.
	 *
	 * @member {Function} core.protocol.hydra.HydraCircuit~_digestListener
	 */
	private _digestListener:Function = null;

	/**
	 * Keeps track of the number of retries in one extension cycle. Gets reset to zero as soon as the extension
	 * succeeded.
	 *
	 * @member {number} core.protocol.hydra.HydraCircuit~_extensionRetryCount
	 */
	private _extensionRetryCount:number = 0;

	/**
	 * Stores the listener on the message center's FILE_TRANSFER message events
	 *
	 * @member {Function} core.protocol.hydra.HydraCircuit~_fileTransferListener
	 */
	private _fileTransferListener:Function = null;

	/**
	 * Flag indicating whether this circuit is torn down and is thus unusable.
	 * Also used for preventing multiple teardowns.
	 *
	 * @member {boolean) core.protocol.hydra.HydraCircuit~_isTornDown
	 */
	private _isTornDown:boolean = false;

	/**
	 * Stores the layered encryption/decryption handler for this circuit, and is kind of the heart of the circuit.
	 *
	 * @member {core.protocol.hydra.LayeredEncDecHandlerInterface) core.protocol.hydra.HydraCircuit~_layeredEncDecHandler
	 */
	private _layeredEncDecHandler:LayeredEncDecHandlerInterface = null;

	/**
	 * The number of maximum retries per extension cycle until the circuit is torn down.
	 *
	 * @member {number) core.protocol.hydra.HydraCircuit~_maximumExtensionRetries
	 */
	private _maximumExtensionRetries:number = 0;

	/**
	 * The working message center.
	 *
	 * @member {core.protocol.hydra.HydraMessageCenterInterface) core.protocol.hydra.HydraCircuit~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	/**
	 * The NodePicker used for choosing relay nodes and additive nodes.
	 *
	 * @member {core.protocol.hydra.NodePickerInterface) core.protocol.hydra.HydraCircuit~_nodePicker
	 */
	private _nodePicker:NodePickerInterface = null;

	/**
	 * Stores the array of relay nodes chosen by the node picker.
	 *
	 * @member {core.protocol.hydra.HydraNodeList) core.protocol.hydra.HydraCircuit~_nodesToExtendWith
	 */
	private _nodesToExtendWith:HydraNodeList = null;

	/**
	 * The desired number of relay nodes this circuit should strive for.
	 *
	 * @member {number) core.protocol.hydra.HydraCircuit~_numOfRelayNodes
	 */
	private _numOfRelayNodes:number = 0;

	/**
	 * Stores the listener on the connection manager's 'circuitTermination' event.
	 *
	 * @member {Function} core.protocol.hydra.HydraCircuit~_terminationListener
	 */
	private _terminationListener:Function = null;

	// TESTING ONLY
	public alsoClosedSocket:boolean = false;

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
	}

	/**
	 * BEGIN TESTING PURPOSES
	 */

	public getCircuitNodes ():HydraNodeList {
		return this._circuitNodes;
	}

	public getLayeredEncDec ():LayeredEncDecHandlerInterface {
		return this._layeredEncDecHandler;
	}

	/**
	 * END TESTING PURPOSES
	 */

	public construct ():void {
		this._nodePicker.pickRelayNodeBatch((batch:HydraNodeList) => {
			this._nodesToExtendWith = batch;

			this._extensionCycle();
		});
	}

	public getCircuitId ():string {
		return this._circuitId;
	}

	public sendFileMessage (payload:Buffer, earlyExit?:HydraNode):void {
		if (this._constructed && !this._isTornDown) {
			this._messageCenter.spitoutFileTransferMessage(this._layeredEncDecHandler, payload, earlyExit);
		}
	}

	public teardown ():void {
		this._teardown(true);
	}

	/**
	 * Extends the circuit by one node (at least tries so) and handles the response appropriately
	 * (error => teardown, rejection => try again if retries left, else teardown, success => extend further or finalize)
	 *
	 * @method core.protocol.hydra.HydraCircuit~_extensionCycle
	 *
	 * @param {core.protocol.hydra.HydraNode} retryNode An optional node to retry the extension with. If this is set, the node
	 * to extend with is not picked from the `_nodesToExtendWith` array.
	 */
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
						this._setupFileTransferListener();
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

	/**
	 * Message listener on ENCRYPTED_DIGEST messages. Tries to decrypt the message and forces it back to the message
	 * center so it can further unwrap the message and act accordingly.
	 *
	 * @method core.protocol.hydra.HydraCircuit~_onEncryptedDigest
	 *
	 * @param {core.protocol.hydra.HydraNode} from The originating node.
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The hydra message with encrypted payload.
	 */
	private _onEncryptedDigest (from:HydraNode, message:ReadableHydraMessageInterface) {

		if (from === this._circuitNodes[0]) {
			this._layeredEncDecHandler.decrypt(message.getPayload(), (err:Error, decryptedBuffer:Buffer) => {

				if (err) {
					this._teardown(true);
				}
				else if (decryptedBuffer && !this._isTornDown) {
					this._messageCenter.forceCircuitMessageThrough(decryptedBuffer, from);
				}
			});
		}
	}

	/**
	 * Removes the event listeners from the connection manager and the message center.
	 *
	 * @method core.protocol.hydra.HydraCircuit~_removeEventListeners
	 */
	private _removeEventListeners ():void {
		if (this._circuitId) {
			this._connectionManager.removeListener('circuitTermination', this._terminationListener);
			this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);

			if (this._fileTransferListener) {
				this._messageCenter.removeListener('FILE_TRANSFER_' + this._circuitId, this._fileTransferListener);
				this._fileTransferListener = null;
			}
		}
	}

	/**
	 * Sets up the listener on the message center's FILE_TRANSFER event. This is only bound when the construction
	 * of the circuit has been completed and is unbound on tearing down the circuit.
	 *
	 * @method core.protocol.hydra.HydraCircuit~_setupFileTransferListener
	 */
	private _setupFileTransferListener ():void {
		this._fileTransferListener = (from:HydraNode, msg:ReadableHydraMessageInterface, decrypted:boolean) => {
			if (from === this._circuitNodes[0]) {
				if (decrypted) {
					this.emit('fileTransferMessage', this._circuitId, msg.getPayload());
				}
				else {
					this._teardown(true);
				}
			}

		}

		this._messageCenter.on('FILE_TRANSFER_' + this._circuitId, this._fileTransferListener);
	}

	/**
	 * Sets up the listeners on the connection manager and the message center.
	 * This function gets called as soon as the circuit has been extended with a first node. (thus has nodes at all, man!)
	 *
	 * @method core.protocol.hydra.HydraCircuit~_setupListeners
	 */
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

	/**
	 * Tears down the socket and thus renders it unusable.
	 *
	 * @method core.protocol.hydra.HydraCircuit~_teardown
	 *
	 * @param {boolean} closeSocket If true, the socket assigned to the first circuit node is closed and cleaned up by the connection manager.
	 */
	private _teardown (closeSocket:boolean):void {
		if (!this._isTornDown) {
			this._isTornDown = true;

			this._removeEventListeners();

			if (closeSocket && this._circuitNodes.length) {
				// Testing only
				this.alsoClosedSocket = true;

				this._connectionManager.removeFromCircuitNodes(this._circuitNodes[0]);
			}

			this.emit('isTornDown');
		}
	}

}

export = HydraCircuit;