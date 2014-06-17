import crypto = require('crypto');

import AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
import HKDF = require('../../crypto/HKDF');
import CircuitExtenderInterface = require('./interfaces/CircuitExtenderInterface');
import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');
import ReadableCellCreatedRejectedMessageInterface = require('./messages/interfaces/ReadableCellCreatedRejectedMessageInterface');

class CircuitExtender implements CircuitExtenderInterface {

	private _reactionTimeInMs:number = 0;
	private _reactionTimeFactor:number = 0;
	private _connectionManager:HydraConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;
	private _encDecHandler:LayeredEncDecHandlerInterface = null;

	private _nodes:HydraNodeList = [];
	private _circuitId:string = null;

	private _currentDiffieHellman:crypto.DiffieHellman = null;

	private _currentCallback:Function = null;

	private _currentUUID:string = null;

	private _expectReactionFrom:HydraNode = null;

	private _currentReactionTimeout:number = 0;

	private _currentNodeToExtendWith:HydraNode = null;

	private _eventListener:Function = null;

	public constructor (reactionTimeInMs:number, reactionTimeFactor:number, connectionManager:HydraConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, encDecHandler:LayeredEncDecHandlerInterface) {

		this._reactionTimeInMs = reactionTimeInMs;
		this._reactionTimeFactor = reactionTimeFactor;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._encDecHandler = encDecHandler;

		this._nodes = this._encDecHandler.getNodes();
	}

	public extend (nodeToExtendWith:HydraNode, additiveNodes:HydraNodeList, callback:(err:Error, isRejection:boolean, newNode:HydraNode) => any):void {
		var isFirst:boolean = this._nodes.length === 0;

		this._currentCallback = callback;

		if (isFirst) {
			this._circuitId = crypto.pseudoRandomBytes(16).toString('hex');

			this._expectReactionFrom = nodeToExtendWith;

			this._eventListener = (ip:string, message:ReadableCellCreatedRejectedMessageInterface) => {
				this._onReaction(ip, message);
			};

			this._messageCenter.on('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
		}

		this._currentUUID = crypto.pseudoRandomBytes(16).toString('hex');

		this._currentNodeToExtendWith = nodeToExtendWith;

		this._currentDiffieHellman = crypto.getDiffieHellman('modp14')

		var dhPublicKey:Buffer = this._currentDiffieHellman.generateKeys();

		AdditiveSharingScheme.getShares(dhPublicKey, additiveNodes.length + 1, 2048, (shares:Array<Buffer>) => {
			// okay, now let the message center pipe it through
			for (var i = 0, l = additiveNodes.length; i < l; i++) {
				this._messageCenter.sendAdditiveSharingMessage(additiveNodes[i], nodeToExtendWith.ip, nodeToExtendWith.port, this._currentUUID, shares[i]);
			}

			// now only the last share is missing. If this is the first one, directly send it to the node, else layer encrypt and send
			// RELAY_EXTEND_CELL
			// then, set the timeout
			if (isFirst) {
				this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(nodeToExtendWith, this._circuitId, this._currentUUID, shares[shares.length - 1]);
			}
			else {
				this._messageCenter.spitoutRelayCreateCellMessage(this._encDecHandler, nodeToExtendWith.ip, nodeToExtendWith.port, this._currentUUID, shares[shares.length - 1], this._circuitId);
			}

			this._currentReactionTimeout = global.setTimeout(() => {
				this._extensionError('Timed out');
			}, this._reactionTimeInMs * Math.pow(this._reactionTimeFactor, this._nodes.length));
		});
	}

	private _onReaction (fromIp:string, message:ReadableCellCreatedRejectedMessageInterface) {
		if (this._expectReactionFrom.ip === fromIp) {

			if (this._currentReactionTimeout) {
				global.clearTimeout(this._currentReactionTimeout);
				this._currentReactionTimeout = 0;
			}

			if (message.getUUID() !== this._currentUUID) {
				this._extensionError('Expected UUID does not match received UUID.');
			}
			else {
				if (message.isRejected()) {
					this._handleRejection();
				}
				else {
					var secret:Buffer = this._currentDiffieHellman.computeSecret(message.getDHPayload());
					var sha1:crypto.Hash = crypto.createHash('sha1');

					sha1.update(secret);

					if (sha1.digest('hex') === message.getSecretHash().toString('hex')) {
						// all well, calculate keys, set the node on _nodes and _encDecHandler and callback
						var hkdf:HKDF = new HKDF('sha256', secret);


						var keysConcat:Buffer = hkdf.derive(256, new Buffer(message.getUUID(), 'hex'));

						var outgoingKey:Buffer = keysConcat.slice(0, 128);
						var incomingKey:Buffer = keysConcat.slice(128);

						var newNode:HydraNode = {
							incomingKey: incomingKey,
							outgoingKey: outgoingKey,
							ip         : this._currentNodeToExtendWith.ip,
							port       : this._currentNodeToExtendWith.port
						};

						if (!this._nodes.length) {
							newNode.circuitId = this._circuitId;
						}

						this._encDecHandler.addNode(newNode);

						this._currentCallback(null, false, newNode);
					}
					else {
						this._extensionError('Hashes of shared secret do not match.');
					}
				}
			}
		}
	}

	private _handleRejection ():void {
		if (!this._nodes.length) {
			this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
		}

		this._currentCallback(null, true, null);
	}

	private _extensionError (errMsg:string):void {
		if (!this._nodes.length) {
			this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._circuitId, this._eventListener);
		}

		this._currentCallback(new Error('CircuitExtender: ' + errMsg), false, null);
	}

}

export = CircuitExtender;