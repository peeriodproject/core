import events = require('events');
import crypto = require('crypto');

import HKDF = require('../../crypto/HKDF');
import AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
import HydraCircuitInterface = require('./interfaces/HydraCircuitInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import NodePickerInterface = require('./interfaces/NodePickerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');
import LayeredEncDecHandlerFactoryInterface = require('./messages/interfaces/LayeredEncDecHandlerFactoryInterface');

class HydraCircuit extends events.EventEmitter implements HydraCircuitInterface {

	private _numOfRelayNodes:number = 0;

	private _additiveSharingNodeAmount:number = 0;

	private _nodePicker:NodePickerInterface = null;

	private _messageCenter:HydraMessageCenterInterface = null;

	private _connectionManager:HydraConnectionManagerInterface = null;

	private _extensionReactionTimeBaseInMs:number = 0;

	private _extensionReactionTimeFactor:number = 0;

	private _layeredEncDecFactory:LayeredEncDecHandlerFactoryInterface = null;

	public constructor (hydraConfig:ConfigInterface, numOfRelayNodes:number, nodePicker:NodePickerInterface, messageCenter:HydraMessageCenterInterface, connectionManager:HydraConnectionManagerInterface, layeredEncDecFactory:LayeredEncDecHandlerFactoryInterface) {
		super();
		this._numOfRelayNodes = numOfRelayNodes;
		this._additiveSharingNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
		this._nodePicker = nodePicker;
		this._messageCenter = messageCenter;
		this._connectionManager = connectionManager;
		this._extensionReactionTimeFactor = hydraConfig.get('hydra.circuit.extensionReactionTimeFactor');
		this._extensionReactionTimeBaseInMs = hydraConfig.get('hydra.circuit.extensionReactionTimeBaseInSeconds') * 1000;
		this._layeredEncDecFactory = layeredEncDecFactory;
	}

}

export = HydraCircuit;