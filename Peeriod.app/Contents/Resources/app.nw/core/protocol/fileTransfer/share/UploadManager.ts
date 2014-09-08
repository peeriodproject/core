import UploadManagerInterface = require('./interfaces/UploadManagerInterface');
import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import UploadFactoryInterface = require('./interfaces/UploadFactoryInterface');
import UploadMap = require('./interfaces/UploadMap');
import UploadInterface = require('./interfaces/UploadInterface');
import ReadableShareRequestMessageFactoryInterface = require('./messages/interfaces/ReadableShareRequestMessageFactoryInterface');
import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');
import UploadBridgeInterface = require('../../../share/interfaces/UploadBridgeInterface');

/**
 * UploadManagerInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.UploadManager
 * @implements core.protocol.fileTransfer.share.UploadManagerInterface
 *
 * @param {core.config.ConfigInterface} transferConfig
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
 * @param {core.protocol.fileTransfer.share.UploadFactoryInterface} uploadFactory
 * @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface} readableShareRequestFactory
 * @param {core.share.UploadBridge} UploadBridgeInterface
 */
class UploadManager implements UploadManagerInterface {

	/**
	 * The list keeping track of the currently active uploads.
	 *
	 * @member {core.protocol.fileTransfer.share.UploadMap} core.protocol.fileTransfer.share.UploadManager~_activeUploads
	 */
	private _activeUploads:UploadMap = {};

	/**
	 * @member {core.share.UploadBridge} core.protocol.fileTransfer.share.UploadManager~_bridge
	 */
	private _bridge:UploadBridgeInterface = null;

	/**
	 * Propulated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.share.UploadManager~_maximumNumberOfParallelUploads
	 */
	private _maximumNumberOfParallelUploads:number = 0;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface} core.protocol.fileTransfer.share.UploadManager~_readableShareRequestFactory
	 */
	private _readableShareRequestFactory:ReadableShareRequestMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.UploadManager~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.UploadFactoryInterface} core.protocol.fileTransfer.share.UploadManager~_uploadFactory
	 */
	private _uploadFactory:UploadFactoryInterface = null;

	public constructor (transferConfig:ConfigInterface, transferMessageCenter:TransferMessageCenterInterface, uploadFactory:UploadFactoryInterface, readableShareRequestMessageFactory:ReadableShareRequestMessageFactoryInterface, uploadBridge:UploadBridgeInterface) {
		this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
		this._transferMessageCenter = transferMessageCenter;
		this._uploadFactory = uploadFactory;
		this._readableShareRequestFactory = readableShareRequestMessageFactory;
		this._bridge = uploadBridge;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getActiveUploads ():UploadMap {
		return this._activeUploads;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	/**
	 * Tries to get the file info from the database by the SHA-1 hash provided in the SHARE_REQUEST message.
	 * If there is a file, a new upload is created and the correct listeners hooked to the upload, which are then
	 * propagated to the bridge.
	 *
	 * NOTE: Only when an upload is finally killed is it removed from the active list.
	 *
	 * @method core.protocol.fileTransfer.share.UploadManager~_constructUploadByRequest
	 *
	 * @param {string} transferIdentifier The transfer identifier of the received SHARE_REQUEST message. This is also used to identify the different uploads.
	 * @param {string} circuitIdOfRequest The identifier of the circuit the SHARE_REQUEST message came through. Preferred circuit for SHARE_RATIFY message.
	 * @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} requestMessage The SHARE_REQUEST message
	 */
	private _constructUploadByRequest (transferIdentifier:string, circuitIdOfRequest:string, requestMessage:ReadableShareRequestMessageInterface):void {
		this._bridge.getFileInfoByHash(requestMessage.getFileHash(), (err:Error, fullFilePath:string, filename:string, filesize:number) => {
			if (!err && fullFilePath) {
				var upload:UploadInterface = this._uploadFactory.create(circuitIdOfRequest, transferIdentifier, requestMessage, fullFilePath, filename, filesize, requestMessage.getFileHash());

				this._activeUploads[transferIdentifier] = upload;

				upload.once('abort', () => {
					this._bridge.emit('manuallyAborted', transferIdentifier);
				});

				upload.once('completed', () => {
					this._bridge.emit('completed', transferIdentifier);
				});

				upload.once('ratifyingRequest', () => {
					this._bridge.emit('ratifyingRequest', transferIdentifier);
				});

				upload.once('startingUpload', () => {
					this._bridge.emit('startingUpload', transferIdentifier);
				});

				upload.on('uploadingBytes', (numberOfBytes:number) => {
					this._bridge.emit('uploadingBytes', transferIdentifier, numberOfBytes);
				});

				upload.once('killed', (reason:string) => {
					var code:string = null;

					switch (reason) {
						case 'File cannot be read.':
							code = 'FS_ERROR';
							break;
						case 'Block cannot be read.':
							code = 'FS_ERROR';
							break;
						case 'Manually aborted.':
							code = 'MANUAL_ABORT';
							break;
						case 'Downloader aborted transfer.':
							code = 'REMOTE_ABORT';
							break;
						case 'Completed.':
							code = 'COMPLETED';
							break;
						case 'Maximum tries exhausted.':
							code = 'TIMED_OUT';
							break;
						default:
							code = 'PROTOCOL_ERR';
					};

					delete this._activeUploads[transferIdentifier];

					this._bridge.emit('end', transferIdentifier, code);
				});

				this._bridge.emit('newUpload', transferIdentifier, fullFilePath, filename, filesize);

				upload.kickOff();
			}
		});
	}

	/**
	 * Sets up the listeners for the message center's SHARE_REQUEST event and on the bridge's 'abortUpload' event for manually
	 * aborting active uploads.
	 *
	 * @method core.protocol.fileTransfer.share.UploadManager~_setupListeners
	 */
	private _setupListeners ():void {
		this._transferMessageCenter.on('SHARE_REQUEST', (transferIdentifier:string, circuitIdOfMessage:string, msgPayload:Buffer) => {
			if ((Object.keys(this._activeUploads).length < this._maximumNumberOfParallelUploads) && !this._activeUploads[transferIdentifier]) {

				var requestMessage:ReadableShareRequestMessageInterface = this._readableShareRequestFactory.create(msgPayload);

				if (requestMessage) {
					this._constructUploadByRequest(transferIdentifier, circuitIdOfMessage, requestMessage);
				}
			}
		});

		this._bridge.on('abortUpload', (identifier:string) => {
			var activeUpload:UploadInterface = this._activeUploads[identifier];

			if (activeUpload) {
				activeUpload.manuallyAbort();
			}
		});
	}
}

export = UploadManager;
