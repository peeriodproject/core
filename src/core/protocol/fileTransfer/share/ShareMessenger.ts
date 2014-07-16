import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');

/**
 * ShareMessengerInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ShareMessenger
 * @interface core.protocol.fileTransfer.share.ShareMessengerInterface
 *
 * @param {core.config.ConfigInterface} fileTransferConfig File transfer configuration object.
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager A working hydra circuit manager instance.
 * @param {core.protocol.fileTransfer.transferMessageCenter} transferMessageCenter The transfer message center instance used on this client.
 */
class ShareMessenger implements ShareMessengerInterface {

	/**
	 * Flag indicating whether a new message can be piped. This is false as long as the messenger is waiting
	 * for a response or when the last message has been piped.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.ShareMessenger~_canPipeNewMessage
	 */
	private _canPipeNewMessage:boolean = false;

	/**
	 * Stores the working hydra circuit manager instance.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.ShareMessenger~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Stores the working hydra circuit manager instance.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.ShareMessenger~_circuitManager
	 */
	private _currentCallback:Function = null;

	/**
	 * Stores the current listener on the expected response message in the transfer message center
	 *
	 * @member {Function} core.protocol.fileTransfer.share.ShareMessenger~_currentMessageListener
	 */
	private _currentMessageListener:Function = null;

	/**
	 * Stores the current event key on the expected response message in the transfer message center
	 *
	 * @member {string} core.protocol.fileTransfer.share.ShareMessenger~_currentMessageListenerKey
	 */
	private _currentMessageListenerKey:string = null;

	/**
	 * This flag indicated whether a response has rolled in, for the timeout to check against before
	 * piping the message again.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.ShareMessenger~_hasResponded
	 */
	private _hasResponded:boolean = false;

	/**
	 * Stores the maximum number of tries sending a message and waiting for a response. Populated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.share.ShareMessenger~_maximumNumberOfMessageTries
	 */
	private _maximumNumberOfMessageTries:number = 0;

	/**
	 * Stores the identifier of the circuit through which the latest response message came through, in order to be able
	 * to reuse the circuit when piping a new message.
	 *
	 * @member {string} core.protocol.fileTransfer.share.ShareMessenger~_messageReceivedThroughCircuitId
	 */
	private _messageReceivedThroughCircuitId:string = null;

	/**
	 * Keeps track of the number of tries sending a message and waiting for a response, for one message.
	 * Gets reset on every message piping cycle.
	 *
	 * @member {number} core.protocol.fileTransfer.share.ShareMessenger~_retryCount
	 */
	private _retryCount:number = 0;

	/**
	 * Stores the working transfer message center instance.
	 *
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.ShareMessenger~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * Stores the number of ms used for the timeout when waiting for a response message. Populated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.share.ShareMessenger~_waitForResponseMessageInMs
	 */
	private _waitForResponseMessageInMs:number = 0;

	/**
	 * Stores the current timeout when waiting for a response.
	 *
	 * @member {number} core.protocol.fileTransfer.share.ShareMessenger~_waitForResponseTimeout
	 */
	private _waitForResponseTimeout:number = 0;

	public constructor (fileTransferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, transferMessageCenter:TransferMessageCenterInterface) {
		this._circuitManager = circuitManager;
		this._transferMessageCenter = transferMessageCenter;
		this._maximumNumberOfMessageTries = fileTransferConfig.get('fileTransfer.shareMessaging.maximumNumberOfMessageTries');
		this._waitForResponseMessageInMs = fileTransferConfig.get('fileTransfer.shareMessaging.waitForResponseMessageInSeconds') * 1000;

		this._canPipeNewMessage = true;
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

	public manuallySetPreferredCircuitId (circuitId:string):void {
		this._messageReceivedThroughCircuitId = circuitId;
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
		this._retryCount = 0;

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

	public teardownLatestCircuit ():void {
		if (this._messageReceivedThroughCircuitId) {
			this._circuitManager.teardownCircuit(this._messageReceivedThroughCircuitId);
			this._messageReceivedThroughCircuitId = null;
		}
	}

	/**
	 * Calls the callback method of the current piping cycle, and cleans up the remaining response message listener
	 * (if still present). Sets the `canPipeNewMessage` flag back to true.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessenger~_doCallback
	 *
	 * @param {Error} err Error argument to pass to callback.
	 * @param {Buffer} responseMessagePayload Payload of the response message to pass to callback.
	 */
	private _doCallback (err:Error, responseMessagePayload:Buffer):void {
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

	/**
	 * Checks if a message can be sent again, and if yes, tries to send it again, else calls back with an error.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessenger~_increaseRetryCountAndIssueAgain
	 *
	 * @param {Buffer} nodesToFeedBlock Buffer representation of the nodes to feed
	 * @param {Buffer} payloadToFeed The message to feed
	 */
	private _increaseRetryCountAndIssueAgain (nodesToFeedBlock:Buffer, payloadToFeed:Buffer):void {
		this._retryCount++;
		if (this._retryCount <= this._maximumNumberOfMessageTries) {
			this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed, false, true);
		}
		else {
			this._doCallback(new Error('Maximum tries exhausted.'), null);
		}
	}

	/**
	 * Self-explanatory multiliner.
	 *
	 * @method core.protocol.fileTransfer.share.ShareMessenger~_increaseRetryCountAndIssueAgain
	 *
	 * @param {Buffer} nodesToFeedBlock Buffer representation of the nodes to feed
	 * @param {Buffer} payloadToFeed The message to feed
	 * @param {boolean} skipCircuitListener If this is true, the issuing is not being tried again when the client has no
	 * working circuits and the circuit count changes (used when repeating function in the circuit count listener). Defaults to false.
	 * @param {boolean} useDifferentCircuit Indicates whether to skip trying to use the last circuit through which a response came through.
	 * @returns {boolean} True if the message could be sent through one circuit, false if no circuit could be used.
	 */
	private _issueFeedAndSetTimeout (nodesToFeedBlock:Buffer, payloadToFeed:Buffer, skipCircuitListener:boolean = false, useDifferentCircuit:boolean = false):boolean {

		var success:boolean = this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed, useDifferentCircuit ? null : this._messageReceivedThroughCircuitId);

		if (success) {

			this._waitForResponseTimeout = global.setTimeout(() => {
				// it's important that this happens here and not after the other function, otherwise the timeout can get lost!
				this._waitForResponseTimeout = 0;

				if (!this._hasResponded) {
					this._increaseRetryCountAndIssueAgain(nodesToFeedBlock, payloadToFeed);
				}

			}, this._waitForResponseMessageInMs);
		}
		else {
			if (!skipCircuitListener) {
				this._circuitManager.once('circuitCount', () => {
					if (!this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed, true, useDifferentCircuit)) {
						this._doCallback(new Error('Maximum tries exhausted.'), null);
					}
				});
			}
		}

		return success;
	}

}

export = ShareMessenger;

