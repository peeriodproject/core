import events = require('events');

import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import ReadableDecryptedMessageInterface = require('./messages/interfaces/ReadableDecryptedMessageInterface');
import ReadableDecryptedMessageFactoryInterface = require('./messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedMessageFactoryInterface');

class HydraCell extends events.EventEmitter implements HydraCellInterface {

	private _connectionManager:ConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	private _predecessor:HydraNode = null;
	private _successor:HydraNode = null;


	private _terminationListener:Function = null;

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

		this._connectionManager.on('circuitTermination', this._terminationListener);
	}

	private _removeListeners ():void {
		this._connectionManager.removeListener('circuitTermination', this._terminationListener);
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
		if (killSuccessor) {
			if (this._successor) {
				this._connectionManager.removeFromCircuitNodes(this._successor);
			}
		}

		this.emit('isTornDown');
	}
}

export = HydraCell;