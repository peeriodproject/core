import events = require('events');

import TransferMessageCenterInterface = require('./interfaces/TransferMessageCenterInterface');
import ReadableFileTransferMessageInterface = require('./messages/interfaces/ReadableFileTransferMessageInterface');
import ReadableFileTransferMessageFactoryInterface = require('./messages/interfaces/ReadableFileTransferMessageFactoryInterface');
import WritableFileTransferMessageFactoryInterface = require('./messages/interfaces/WritableFileTransferMessageFactoryInterface');
import CircuitManagerInterface = require('../hydra/interfaces/CircuitManagerInterface');
import CellManagerInterface = require('../hydra/interfaces/CellManagerInterface');
import HydraMessageCenterInterface = require('../hydra/interfaces/HydraMessageCenterInterface');


class TransferMessageCenter extends events.EventEmitter implements TransferMessageCenterInterface {

	private _circuitManager:CircuitManagerInterface = null;
	private _cellManager:CellManagerInterface = null;
	private _hydraMessageCenter:HydraMessageCenterInterface = null;
	private _readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface = null;
	private _writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface = null;


	public constructor (circuitManager:CircuitManagerInterface, cellManager:CellManagerInterface, hydraMessageCenter:HydraMessageCenterInterface, readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface, writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface) {
		super();

		this._circuitManager = circuitManager;
		this._cellManager = cellManager;
		this._hydraMessageCenter = hydraMessageCenter;

		this._readableFileTransferMessageFactory = readableFileTransferMessageFactory;
		this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;

		this._setupListeners();
	}

	private _setupListeners ():void {
		this._circuitManager.on('circuitReceivedTransferMessage', (circuitId:string, payload:Buffer) => {
			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onCircuitTransferMessage(circuitId, msg);
			}
			else {
				this._circuitManager.teardownCircuit(circuitId);
			}
		});

		this._cellManager.on('cellReceivedTransferMessage', (predecessorCircuitId:string, payload:Buffer) => {
			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onCellTransferMessage(predecessorCircuitId, msg);
			}
			else {
				this._cellManager.teardownCell(predecessorCircuitId);
			}
		});

		this._hydraMessageCenter.on('regularFileTransferMsg', (socketIdentifier:string, payload:Buffer) => {
			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onFedTransferMessage(socketIdentifier, msg);
			}
		});
	}

	private _onCircuitTransferMessage (circuitId:string, msg:ReadableFileTransferMessageInterface):void {

	}

	private _onCellTransferMessage (predecessorCircuitId:string, msg:ReadableFileTransferMessageInterface):void {

	}

	private _onFedTransferMessage (socketIdentifier:string, msg:ReadableFileTransferMessageInterface):void {

	}
}

export = TransferMessageCenter;
