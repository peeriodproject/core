import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');

class ShareMessenger implements ShareMessengerInterface {

	private _circuitManager:CircuitManagerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _maximumNumberOfMessageTries:number = 0;
	private _waitForResponseMessageInMs:number = 0;

	private _canPipeNewMessage:boolean = false;
	private _waitForResponseTimeout:number = 0;

	private _currentMessageListener:Function = null;
	private _currentMessageListenerKey:string = null;

	private _messageReceivedThroughCircuitId:string = null;
	private _retryCount:number = 0;
	private _hasResponded:boolean = false;

	private _currentCallback:Function = null;

	public constructor (fileTransferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, transferMessageCenter:TransferMessageCenterInterface) {
		this._circuitManager = circuitManager;
		this._transferMessageCenter = transferMessageCenter;
		this._maximumNumberOfMessageTries = fileTransferConfig.get('fileTransfer.shareMessaging.maximumNumberOfMessageTries');
		this._waitForResponseMessageInMs = fileTransferConfig.get('fileTransfer.shareMessaging.waitForResponseMessageInSeconds') * 1000;

		this._canPipeNewMessage = true;
	}

	public pipeMessageAndWaitForResponse (payloadToFeed:Buffer, nodesToFeedBlock:Buffer, expectedMessageType:string, expectedTransferIdentifier:string, callback:(err:Error, reactionMessagePayload:Buffer) => any):void {
		if (!this._canPipeNewMessage) {
			process.nextTick(function () {
				callback(new Error('ShareMessenger: Cannot pipe message, still waiting for response.'), null);
			});
			return;
		}

		this._canPipeNewMessage = false;
		this._hasResponded = false;
		this._currentCallback = callback;

		this._currentMessageListenerKey = expectedMessageType + '_' + expectedTransferIdentifier;
		this._currentMessageListener = (circuitId:string, responseMessagePayload:Buffer) => {
			this._hasResponded = true;
			this._messageReceivedThroughCircuitId = circuitId;
			this._currentMessageListener = null;
			this._currentMessageListenerKey = null;

			if (this._waitForResponseTimeout) {
				global.clearTimeout(this._waitForResponseTimeout);
				this._waitForResponseTimeout = 0;
			}

			this._doCallback(null, responseMessagePayload);
		};

		this._transferMessageCenter.once(this._currentMessageListenerKey, this._currentMessageListener);

		this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed);

	}

	public pipeLastMessage (payloadToFeed:Buffer, nodesToFeedBlock:Buffer):void {
		if (!this._canPipeNewMessage) {
			throw new Error('ShareMessenger: Cannot pipe message, still waiting for another response.');
		}

		this._canPipeNewMessage = false;

		if (!this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed, this._messageReceivedThroughCircuitId)) {
			this._circuitManager.once('circuitCount', () => {
				this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed);
			});
		}
	}

	public teardownLatestCircuit ():void {
		if (this._messageReceivedThroughCircuitId) {
			this._circuitManager.teardownCircuit(this._messageReceivedThroughCircuitId);
			this._messageReceivedThroughCircuitId = null;
		}
	}

	private _issueFeedAndSetTimeout (nodesToFeedBlock:Buffer, payloadToFeed:Buffer, skipCircuitListener:boolean = false):boolean {
		var success:boolean = this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed, this._messageReceivedThroughCircuitId);

		if (success) {
			this._waitForResponseTimeout = global.setTimeout(() => {
				if (!this._hasResponded) {
					this._increaseRetryCountAndIssueAgain(nodesToFeedBlock, payloadToFeed);
				}
				this._waitForResponseTimeout = 0;
			}, this._waitForResponseMessageInMs);
		}
		else {
			if (!skipCircuitListener) {
				this._circuitManager.once('circuitCount', () => {
					if (!this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed, true)) {
						this._doCallback(new Error('Maximum tries exhausted.'), null);
					}
				});
			}
		}

		return success;
	}

	private _increaseRetryCountAndIssueAgain (nodesToFeedBlock:Buffer, payloadToFeed:Buffer):void {
		this._retryCount++;
		if (this._retryCount <= this._maximumNumberOfMessageTries) {
			this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed);
		}
		else {
			this._doCallback(new Error('Maximum tries exhausted.'), null);
		}
	}

	private _doCallback (err:Error, responseMessagePayload:Buffer) {
		if (this._currentCallback) {
			var cb:Function = this._currentCallback;

			if (this._currentMessageListener) {
				this._transferMessageCenter.removeListener(this._currentMessageListenerKey, this._currentMessageListener);
				this._currentMessageListener = null;
				this._currentMessageListenerKey = null;
			}

			this._currentCallback = null;
			this._canPipeNewMessage = true;

			cb(err, responseMessagePayload);
		}
	}

}

export = ShareMessenger;

