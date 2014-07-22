import UploadManagerInterface = require('./interfaces/UploadManagerInterface');

import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import UploadFactoryInterface = require('./interfaces/UploadFactoryInterface');
import UploadMap = require('./interfaces/UploadMap');
import UploadInterface = require('./interfaces/UploadInterface');
import ReadableShareRequestMessageFactoryInterface = require('./messages/interfaces/ReadableShareRequestMessageFactoryInterface');
import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');
import UploadBridgeInterface = require('../../../share/interfaces/UploadBridgeInterface');

class UploadManager implements UploadManagerInterface {

	private _maximumNumberOfParallelUploads:number = 0;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _uploadFactory:UploadFactoryInterface = null;
	private _activeUploads:UploadMap = {};
	private _readableShareRequestFactory:ReadableShareRequestMessageFactoryInterface = null;
	private _bridge:UploadBridgeInterface = null;

	public constructor (transferConfig:ConfigInterface, transferMessageCenter:TransferMessageCenterInterface, uploadFactory:UploadFactoryInterface, readableShareRequestMessageFactory:ReadableShareRequestMessageFactoryInterface, uploadBridge:UploadBridgeInterface) {
		this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
		this._transferMessageCenter = transferMessageCenter;
		this._uploadFactory = uploadFactory;
		this._readableShareRequestFactory = readableShareRequestMessageFactory;
		this._bridge = uploadBridge;

		this._setupListeners();
	}

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
