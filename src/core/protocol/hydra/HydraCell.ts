import events = require('events');
import crypto = require('crypto');

import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import ReadableDecryptedMessageInterface = require('./messages/interfaces/ReadableDecryptedMessageInterface');
import ReadableAdditiveSharingMessageInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableDecryptedMessageFactoryInterface = require('./messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedMessageFactoryInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');
import ReadableCreateCellAdditiveMessageInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageInterface');
import ReadableCellCreatedRejectedMessageInterface = require('./messages/interfaces/ReadableCellCreatedRejectedMessageInterface');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * HydraCellInterface implementation.
 *
 * @class core.protocol.hydra.HydraCell
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.hydra.HydraCellInterface
 *
 * @param {core.protocol.hydra.HydraNode} predecessor The predecessor node of the cell. Must have a socket identifier, shared keys, circuit ID, etc.
 * @param {core.config.ConfigInterface} hydraConfig Hydra configuration.
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
 * @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter A working hydra message center instance.
 * @param {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} decryptionFactory Factory for decrypting single messages.
 * @param {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} encryptionFactory Factory for encrypting single messages.
 */
class HydraCell extends events.EventEmitter implements HydraCellInterface {

	/**
	 * Stores the connection manager.
	 *
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCell~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * Stores the timeout which gets set when the cell is extended.
	 * Represents the time to wait for a response to the request until the cell is torn down.
	 *
	 * @member {number|NodesJS.Timeout} core.protocol.hydra.HydraCell~_currentExtensionTimeout
	 */
	private _currentExtensionTimeout:number = 0;

	/**
	 * The UUID of the additive sharing scheme used for extending the cell. This is extracted from the
	 * RELAY_CREATE_CELL message
	 *
	 * @member {string} core.protocol.hydra.HydraCell~_currentExtensionUuid
	 */
	private _currentExtensionUuid:string = null;

	/**
	 * The decryption factory for single messages.
	 *
	 * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.hydra.HydraCell~_decrypter
	 */
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;

	/**
	 * The event listener for ENCRYPTED_DIGEST events. This is set up as soon as a successor has been successfully added.
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_digestListener
	 */
	private _digestListener:Function = null;

	/**
	 * The encryption factory for single messages.
	 *
	 * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.hydra.HydraCell~_encrypter
	 */
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	/**
	 * The listener on RELAY_CREATE_CELL messages (pseudotype of ADDITIVE_SHARING).
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_extensionListener
	 */
	private _extensionListener:Function = null;

	/**
	 * The number of milliseconds a node has time to react before the extension is considered unsuccessful
	 *
	 * @member {number} core.protocol.hydra.HydraCell~_extensionReactionInMs
	 */
	private _extensionReactionInMs:number = 0;

	/**
	 * The event listener on the CELL_CREATED_REJECTED message. Gets bound as soon as the cell is extended and unbound
	 * when the cell is torn down or the response message has rolled in.
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_extensionResponseListener
	 */
	private _extensionResponseListener:Function = null;

	/**
	 * The event listener on FILE_TRANSFER messages. Gets bound on construction and unbound when the cell is torn down.
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_fileTransferListener
	 */
	private _fileTransferListener:Function = null;

	/**
	 * A flag indicating whether the cell has been torn down (and is thus rendered unusable) or not.
	 *
	 * @member {boolean} core.protocol.hydra.HydraCell~_isTornDown
	 */
	private _isTornDown:boolean = false;

	/**
	 * Stores the message center instance.
	 *
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCell~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	/**
	 * The predecessor node of the cell.
	 *
	 * Remember: Hydra circuits and cells are object sensitive! If you change the object or alter it, many things will break!
	 *
	 * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.HydraCell~_predecessor
	 */
	private _predecessor:HydraNode = null;

	/**
	 * The event listener on ENCRYPTED_SPITOUT functions. Gets bound on creation and unbound on tearing down.
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_spitoutListener
	 */
	private _spitoutListener:Function = null;

	/**
	 * The successor node of the cell. Can be `null` if it does not have a successor
	 *
	 * Remember: Hydra circuits and cells are object sensitive! If you change the object or alter it, many things will break!
	 *
	 * @member {core.protocol.hydra.HydraNode} core.protocol.hydra.HydraCell~_successor
	 */
	private _successor:HydraNode = null;

	/**
	 * The listener on the 'circuitTermination' event.
	 * Bound on creation, unbound on tearing down.
	 *
	 * @member {Function} core.protocol.hydra.HydraCell~_terminationListener
	 */
	private _terminationListener:Function = null;


	public constructor (predecessorNode:HydraNode, hydraConfig:ConfigInterface, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, decryptionFactory:ReadableDecryptedMessageFactoryInterface, encryptionFactory:WritableEncryptedMessageFactoryInterface) {
		super();

		this._predecessor = predecessorNode;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._decrypter = decryptionFactory;
		this._encrypter = encryptionFactory;

		this._extensionReactionInMs = hydraConfig.get('hydra.cell.extensionReactionInSeconds') * 1000;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getPredecessor ():HydraNode {
		return this._predecessor;
	}

	public getSuccessor ():HydraNode {
		return this._successor;
	}

	public getCurrentUUID ():string {
		return this._currentExtensionUuid;
	}

	public getExtensionTimeout ():number {
		return this._currentExtensionTimeout;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public getFeedingIdentifier ():string {
		return this._predecessor.feedingIdentifier;
	}

	public getPredecessorCircuitId ():string {
		return this._predecessor.circuitId;
	}

	public sendFileMessage (payload:Buffer):void {
		if (!this._isTornDown) {
			var fileTransferMsg:Buffer = this._messageCenter.wrapFileTransferMessage(payload);
			this._digestBuffer(fileTransferMsg, true);
		}
	}

	public teardown ():void {
		this._teardown(true, true);
	}

	/**
	 * Clears the timeout of a cell extension (if present)
	 *
	 * @method core.protocol.hydra.HydraCell~_clearExtensionTimeout
	 */
	private _clearExtensionTimeout ():void {
		if (this._currentExtensionTimeout) {
			global.clearTimeout(this._currentExtensionTimeout);
			this._currentExtensionTimeout = 0;
		}
	}

	/**
	 * Sends on an ENCRYPTED_DIGEST message with a given payload, which gets encrypted
	 * If the client is the initiator of the ENCRYPTED_DIGEST message onion, `isReceiver` must be `true`.
	 *
	 * @method core.protocol.hydra.HydraCell~_digestBuffer
	 *
	 * @param {Buffer} buffer The payload to encrypt and pipe through the circuit.
	 * @param {boolean} isReceiver Indicates if the client is the initiator of the message.
	 */
	private _digestBuffer (buffer:Buffer, isReceiver:boolean = false):void {
		this._encrypter.encryptMessage(this._predecessor.outgoingKey, isReceiver, buffer, (err:Error, encrypted:Buffer) => {
			if (!err && encrypted) {
				this._connectionManager.pipeCircuitMessageTo(this._predecessor, 'ENCRYPTED_DIGEST', encrypted);
			}
		});
	}

	/**
	 * Kicks of a cell extension. This function gets called when a RELAY_CREATE_CELL request comes in.
	 * Immediately sets the successor after generating a circuit Id, sends on the CREATE_CELL_ADDITIVE message as initiator,
	 * and waits for a response (sets a timeout, of course).
	 *
	 * @method core.protocol.hydra.HydraCell~_extendCellWith
	 *
	 * @param {string} ip The ip of the node to extend the cell with.
	 * @param {number} port The port of the node to extend the cell with.
	 * @param {string} uuid The UUID of the additive sharing scheme used.
	 * @param {Buffer} additivePayload The payload of the additive share.
	 */
	private _extendCellWith (ip:string, port:number, uuid:string, additivePayload:Buffer):void {
		var circuitId:string = crypto.pseudoRandomBytes(16).toString('hex');

		this._currentExtensionUuid = uuid;

		this._successor = {
			ip       : ip,
			port     : port,
			circuitId: circuitId
		};

		logger.log('hydraCell', 'Further extending cell', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier, successorCircuit: this._successor.circuitId, timeoutMs: this._extensionReactionInMs});

		this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(this._successor, circuitId, uuid, additivePayload);

		// set the timeout
		this._currentExtensionTimeout = global.setTimeout(() => {
			this._currentExtensionTimeout = 0;
			logger.log('hydraCell', 'Cell extension timed out', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier, successorCircuit: this._successor.circuitId, timeoutMs: this._extensionReactionInMs});
			this._teardown(true, true);
		}, this._extensionReactionInMs);

		this._extensionResponseListener = (from:HydraNode, msg:ReadableCellCreatedRejectedMessageInterface) => {
			this._clearExtensionTimeout();
			this._onExtensionResponse(from, msg);
		};

		this._messageCenter.on('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
	}

	/**
	 * Initiates an ENCRYPTED_DIGEST message with a given readable, already unwrapped message.
	 * This is used for CELL_CREATED_REJECTED messages for example, as the client needs to send on the message but
	 * also needs knowledge of the content.
	 *
	 * @method core.protocol.hydra.HydraCell~_initiateDigestWithReadableMessage
	 *
	 * @param {string} messageType The human readable representation of the readable message's message type.
	 * @param {any} msg Any readable message.
	 */
	private _initiateDigestWithReadableMessage (messageType:string, msg:any):void {
		var payload:Buffer = this._messageCenter.getFullBufferOfMessage(messageType, msg);

		if (payload) {
			this._digestBuffer(payload, true);
		}
	}

	/**
	 * Functions that gets called when a circuit socket is terminated. Checks if the terminated circuit is assigned
	 * to the successor/predecessor of this is cell, and if yes, tears it down.
	 *
	 * @method core.protocol.hydra.HydraCell~_onCircuitTermination
	 *
	 * @param {string} terminatedCircuitId The circuitId assigned to the terminated socket.
	 */
	private _onCircuitTermination (terminatedCircuitId:string):void {
		if (this._predecessor.circuitId === terminatedCircuitId) {
			logger.log('hydraCell', 'Predecessor circuit terminated', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier});

			this._teardown(false, true);
		}
		else if (this._successor && this._successor.circuitId === terminatedCircuitId) {
			logger.log('hydraCell', 'Successor circuit terminated', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier});
			this._teardown(true, false);
		}
	}

	/**
	 * Function that gets called as soon as a response to a cell extension request rolls in.
	 * Clears everything up. If anything goes wrong, tears down the circuit.
	 *
	 * Removes the successor from the cell and the circuit nodes of the connection manager on rejection, thus being
	 * able to extend the cell again later.
	 * If the request was accepted, the ENCRYPTED_DIGEST listener on the now shared circuit ID is bound.
	 *
	 * Either way, the message is passed on through the digestion track.
	 *
	 * @method core.protocol.hydra.HydraCell~_onExtensionResponse
	 *
	 * @param {core.protocol.hydra.HydraNode} from The node the response originates from.
	 * @param {core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface} msg The received response.
	 */
	private _onExtensionResponse (from:HydraNode, msg:ReadableCellCreatedRejectedMessageInterface):void {
		logger.log('hydraCell', 'Received extension response', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier});

		if (from === this._successor) {
			this._removeExtensionResponseListener();

			if (msg.getUUID() === this._currentExtensionUuid) {
				if (msg.isRejected()) {
					logger.log('hydraCell', 'Extension was rejected', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier});

					var succ:HydraNode = this._successor;
					this._successor = null;
					this._connectionManager.removeFromCircuitNodes(succ);
				}
				else {
					this._setupDigestListener();
				}

				this._initiateDigestWithReadableMessage('CELL_CREATED_REJECTED', msg);
			}
			else {
				logger.log('hydraCell', 'Wrong node', {circuitId: this._predecessor.circuitId, socketIdent: this._predecessor.socketIdentifier, successorCircuit: this._successor.circuitId, successorSocketIdent: this._successor.socketIdentifier, receivedSocketIdent: from.socketIdentifier});
				this._teardown(true, true);
			}
		}
	}

	/**
	 * Function that gets called when the cell receives a ENCRYPTED_SPITOUT message.
	 * The message is decrypted and checked if one is the intended receiver for the message. If yes, it is handled accordingly.
	 * If not, the decrypted message is passed on to the successor (if there is one).
	 * If one is not the intended receiver and there is no successor, something must have gone wrong and the cell is torn down.
	 *
	 * @method core.protocol.hydra.HydraCell~_onSpitoutMessage
	 *
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The ENCRYPTED_SPITOUT message with the encrypted payload.
	 */
	private _onSpitoutMessage (message:ReadableHydraMessageInterface) {
		var decryptedMessage:ReadableDecryptedMessageInterface = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

		if (decryptedMessage.isReceiver()) {
			this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
		}
		else if (this._successor && this._successor.socketIdentifier) {
			this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', decryptedMessage.getPayload());
		}
		else {
			logger.log('hydraCell', 'Tearing down cell, wrong message receiver', {circuitId: this._predecessor.circuitId});
			this._teardown(true, true);
		}
	}

	/**
	 * Removes the listener on the CELL_CREATED_REJECTED messages.
	 * This is called on either tearing down the cell or when a response the the extension request has rolled in from the intended node.
	 *
	 * @method core.protocol.hydra.HydraCell~_removeExtensionResponseListener
	 */
	private _removeExtensionResponseListener ():void {
		if (this._extensionResponseListener && this._successor) {
			this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
			this._extensionResponseListener = null;
		}
	}

	/**
	 * Cleans up all listeners flying around.
	 * This is only called on teardown.
	 *
	 * @method core.protocol.hydra.HydraCell~_removeListeners
	 */
	private _removeListeners ():void {
		this._connectionManager.removeListener('circuitTermination', this._terminationListener);

		this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
		this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
		this._messageCenter.removeListener('FILE_TRANSFER_' + this._predecessor.circuitId, this._fileTransferListener);

		this._spitoutListener = null;
		this._extensionListener = null;

		if (this._digestListener) {
			this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
			this._digestListener = null;
		}

		this._removeExtensionResponseListener();

	}

	/**
	 * Sets up the ENCRYPTED_DIGEST listener on the successor node. Basically it is just further encrypting the
	 * received content and passing it on the digestion track.
	 *
	 * @method core.protocol.hydra.HydraCell~_setupDigestListener
	 */
	private _setupDigestListener ():void {
		this._digestListener = (from:HydraNode, msg:ReadableHydraMessageInterface) => {
			if (from === this._successor) {
				this._digestBuffer(msg.getPayload());
			}
		};

		this._messageCenter.on('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
	}

	/**
	 * The basic listener setup on creation of the cell.
	 *
	 * @method core.protocol.hydra.HydraCell~_setupListeners
	 */
	private _setupListeners ():void {
		this._terminationListener = (terminatedCircuitId:string) => {
			this._onCircuitTermination(terminatedCircuitId);
		};

		this._spitoutListener = (from:HydraNode, msg:ReadableHydraMessageInterface) => {
			if (from === this._predecessor) {
				this._onSpitoutMessage(msg);
			}
		};

		this._extensionListener = (from:HydraNode, msg:ReadableAdditiveSharingMessageInterface, decrypted:boolean) => {
			if (from === this._predecessor) {
				var createCellMsg:ReadableCreateCellAdditiveMessageInterface = this._messageCenter.unwrapAdditiveSharingPayload(msg);

				if (createCellMsg && decrypted && !this._successor) {
					this._extendCellWith(msg.getIp(), msg.getPort(), createCellMsg.getUUID(), createCellMsg.getAdditivePayload());
				}
				else {
					this._teardown(true, true);
				}
			}
		};

		this._fileTransferListener = (from:HydraNode, msg:ReadableHydraMessageInterface, decrypted:boolean) => {
			if (from === this._predecessor) {
				if (decrypted) {
					this.emit('fileTransferMessage', this._predecessor.circuitId, msg.getPayload());
				}
				else {
					this._teardown(true, true);
				}
			}

		}

		this._connectionManager.on('circuitTermination', this._terminationListener);
		this._messageCenter.on('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
		this._messageCenter.on('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
		this._messageCenter.on('FILE_TRANSFER_' + this._predecessor.circuitId, this._fileTransferListener);
	}

	/**
	 * Tears down the circuit. Cleans up everything and emits the 'isTornDown' event.
	 *
	 * @method core.protocol.hydra.HydraCell~_teardown
	 *
	 * @param {boolean} killPredecessor Indicates if the socket assigned to the predecessor should be removed.
	 * @param {boolean} killSuccessor Indicates if the socket assigned to the successor should be removed (if there is one)
	 */
	private _teardown (killPredecessor:boolean, killSuccessor:boolean):void {
		if (!this._isTornDown) {

			this._isTornDown = true;

			this._removeListeners();
			this._clearExtensionTimeout();

			if (killPredecessor) {
				this._connectionManager.removeFromCircuitNodes(this._predecessor);
			}
			if (killSuccessor && this._successor) {
				this._connectionManager.removeFromCircuitNodes(this._successor);
			}

			this.emit('isTornDown');
		}
	}
}

export = HydraCell;