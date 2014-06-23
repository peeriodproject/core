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

class HydraCell extends events.EventEmitter implements HydraCellInterface {

	private _connectionManager:ConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	private _predecessor:HydraNode = null;
	private _successor:HydraNode = null;

	private _isTornDown:boolean = false;

	private _terminationListener:Function = null;
	private _spitoutListener:Function = null;
	private _digestListener:Function = null;
	private _extensionListener:Function = null;

	private _extensionReactionInMs:number = 0;
	private _currentExtensionUuid:string = null;
	private _currentExtensionTimeout:number = 0;
	private _extensionResponseListener:Function = null;

	public constructor (predecessorNode:HydraNode, hydraConfig:ConfigInterface, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, decryptionFactory:ReadableDecryptedMessageFactoryInterface, encryptionFactory:WritableEncryptedMessageFactoryInterface) {
		super();

		this._predecessor = predecessorNode;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._decrypter = decryptionFactory;
		this._encrypter = encryptionFactory;

		this._extensionReactionInMs = hydraConfig.get('cell.extensionReactionInSeconds') * 1000;

		this._setupListeners();
	}

	private _extendCellWith(ip:string, port:number, uuid:string, additivePayload:Buffer):void {
		var circuitId:string = crypto.pseudoRandomBytes(16).toString('hex');

		this._currentExtensionUuid = uuid;

		this._successor = {
			ip: ip,
			port: port,
			circuitId: circuitId
		};

		this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(this._successor, circuitId, uuid, additivePayload);

		// set the timeout
		this._currentExtensionTimeout = global.setTimeout(() => {
			this._currentExtensionTimeout = 0;
			this._teardown(true, true);
		}, this._extensionReactionInMs);

		this._extensionResponseListener = (from:HydraNode, msg:ReadableCellCreatedRejectedMessageInterface) => {
			this._clearExtensionTimeout();
			this._onExtensionResponse(from, msg);
		};

		this._messageCenter.on('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
	}

	private _onExtensionResponse (from:HydraNode, msg:ReadableCellCreatedRejectedMessageInterface):void {
		if (from === this._successor) {
			this._removeExtensionResponseListener();

			if (msg.getUUID() === this._currentExtensionUuid) {
				if (msg.isRejected()) {
					var succ:HydraNode = this._successor;
					this._successor = null;
					this._connectionManager.removeFromCircuitNodes(succ);
				}
				else {
					this._setupDigestListener();
				}

				this._initiateDigest('CELL_CREATED_REJECTED', msg);
			}
			else {
				this._teardown(true, true);
			}
		}
	}

	private _initiateDigest (messageType:string, msg:any):void {
		var payload:Buffer = this._messageCenter.getFullBufferOfMessage(messageType, msg);

		if (payload) {
			this._digestBuffer(payload, true);
		}
	}

	private _digestBuffer (buffer:Buffer, isReceiver:boolean = false):void {
		this._encrypter.encryptMessage(this._predecessor.outgoingKey, isReceiver, buffer, (err:Error, encrypted:Buffer) => {
			if (!err && encrypted) {
				this._connectionManager.pipeCircuitMessageTo(this._predecessor, 'ENCRYPTED_DIGEST', encrypted);
			}
		});
	}



	private _setupDigestListener ():void {
		this._digestListener = (from:HydraNode, msg:ReadableHydraMessageInterface) => {
			if (from === this._successor) {
				this._digestBuffer(msg.getPayload());
			}
		};

		this._messageCenter.on('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
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
				var createCellMsg:ReadableCreateCellAdditiveMessageInterface = this._messageCenter.unwrapAdditiveSharingPayload(msg);

				if (createCellMsg && decrypted && !this._successor) {
					this._extendCellWith(msg.getIp(), msg.getPort(), createCellMsg.getUUID(), createCellMsg.getAdditivePayload());
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

	private _removeExtensionResponseListener ():void {
		if (this._extensionResponseListener && this._successor) {
			this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
			this._extensionResponseListener();
		}
	}

	private _removeListeners ():void {
		this._connectionManager.removeListener('circuitTermination', this._terminationListener);

		this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
		this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);

		this._spitoutListener = null;
		this._extensionListener = null;

		if (this._digestListener) {
			this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
			this._digestListener = null;
		}

		this._removeExtensionResponseListener();

	}

	private _onSpitoutMessage (message:ReadableHydraMessageInterface) {
		var decryptedMessage:ReadableDecryptedMessageInterface = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

		if (decryptedMessage.isReceiver()) {
			this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
		}
		else if (this._successor && this._successor.socketIdentifier) {
			this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', message.getPayload());
		}
		else {
			this._teardown(true, true);
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

	private _clearExtensionTimeout ():void {
		if (this._currentExtensionTimeout) {
			global.clearTimeout(this._currentExtensionTimeout);
			this._currentExtensionTimeout = 0;
		}
	}

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