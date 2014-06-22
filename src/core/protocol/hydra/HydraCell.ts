import events = require('events');

import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import ReadableDecryptedMessageInterface = require('./messages/interfaces/ReadableDecryptedMessageInterface');
import ReadableAdditiveSharingMessageInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableDecryptedMessageFactoryInterface = require('./messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedMessageFactoryInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');

class HydraCell extends events.EventEmitter implements HydraCellInterface {

	private _connectionManager:ConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	private _predecessor:HydraNode = null;
	private _successor:HydraNode = null;


	private _terminationListener:Function = null;
	private _spitoutListener:Function = null;
	private _digestListener:Function = null;
	private _extensionListener:Function = null;

	public constructor (predecessorNode:HydraNode, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, decryptionFactory:ReadableDecryptedMessageFactoryInterface, encryptionFactory:WritableEncryptedMessageFactoryInterface) {
		super();

		this._predecessor = predecessorNode;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._decrypter = decryptionFactory;
		this._encrypter = encryptionFactory;

		this._setupListeners();
	}

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
				if (decrypted && !this._successor) {
					// extend cell
					// @todo
				}
				else {
					this._teardown(true, true);
				}
			}
		};

		this._connectionManager.on('circuitTermination', this._terminationListener);
		this._messageCenter.on('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
		this._messageCenter.on('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
	}

	private _removeListeners ():void {
		this._connectionManager.removeListener('circuitTermination', this._terminationListener);

		this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
		this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);

		if (this._digestListener) {
			this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
		}

	}

	private _onSpitoutMessage (message:ReadableHydraMessageInterface) {
		var decryptedMessage:ReadableDecryptedMessageInterface = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

		if (decryptedMessage.isReceiver()) {
			this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
		}
		else if (this._successor) {
			this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', message.getPayload());
		}
		else {
			this._teardown(true, false);
		}
	}

	private _onCircuitTermination (terminatedCircuitId:string):void {
		// tear down the circuit.

		if (this._predecessor.circuitId === terminatedCircuitId) {
			this._teardown(false, true);
		}
		else if (this._successor && this._successor.circuitId === terminatedCircuitId) {
			this._teardown(true, false);
		}
	}

	private _teardown (killPredecessor:boolean, killSuccessor:boolean):void {
		this._removeListeners();

		if (killPredecessor) {
			this._connectionManager.removeFromCircuitNodes(this._predecessor);
		}
		if (killSuccessor && this._successor) {
			this._connectionManager.removeFromCircuitNodes(this._successor);
		}

		this.emit('isTornDown');
	}
}

export = HydraCell;