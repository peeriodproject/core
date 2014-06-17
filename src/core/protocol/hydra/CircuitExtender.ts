import crypto = require('crypto');

import AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
import HKDF = require('../../crypto/HKDF');
import CircuitExtenderInterface = require('./interfaces/CircuitExtenderInterface');
import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');

class CircuitExtender implements CircuitExtenderInterface {

	private _reactionTimeInMs:number = 0;
	private _connectionManager:HydraConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;
	private _encDecHandler:LayeredEncDecHandlerInterface = null;

	private _nodes:HydraNodeList = [];
	private _circuitId:string = null;

	private _currentDiffieHellman:crypto.DiffieHellman = null;

	private _currentCallback:Function = null;

	private _currentUUID:string = null;

	public constructor (reactionTimeInMs:number, connectionManager:HydraConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, encDecHandler:LayeredEncDecHandlerInterface) {
		this._reactionTimeInMs = reactionTimeInMs;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._encDecHandler = encDecHandler;

		this._nodes = this._encDecHandler.getNodes();
	}

	public extend (nodeToExtendWith:HydraNode, additiveNodes:HydraNodeList, callback: (err:Error, isRejection:boolean, newNode:HydraNode) => any):void {
		var isFirst:boolean = this._nodes.length === 0;

		this._currentCallback = callback;

		if (isFirst) {
			this._circuitId = crypto.pseudoRandomBytes(16).toString('hex');

			/**
			 * @todo: Setup the listener here
			 */

		}

		this._currentUUID = crypto.pseudoRandomBytes(16).toString('hex');

		this._currentDiffieHellman = crypto.getDiffieHellman('modp14')

		var dhPublicKey:Buffer = this._currentDiffieHellman.generateKeys();

		AdditiveSharingScheme.getShares(dhPublicKey, additiveNodes.length + 1, 2048, (shares:Array<Buffer>) => {
			// okay, now let the message center pipe it through

		});
	}

}

export = CircuitExtender;