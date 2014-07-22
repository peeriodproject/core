import UploadManagerInterface = require('./interfaces/UploadManagerInterface');

import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import UploadFactoryInterface = require('./interfaces/UploadFactoryInterface');
import UploadMap = require('./interfaces/UploadMap');
import ReadableShareRequestMessageFactoryInterface = require('./messages/interfaces/ReadableShareRequestMessageFactoryInterface');
import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');

class UploadManager implements UploadManagerInterface {

	private _maximumNumberOfParallelUploads:number = 0;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _uploadFactory:UploadFactoryInterface = null;
	private _activeUploads:UploadMap = {};
	private _readableShareRequestFactory:ReadableShareRequestMessageFactoryInterface = null;

	public constructor (transferConfig:ConfigInterface, transferMessageCenter:TransferMessageCenterInterface, uploadFactory:UploadFactoryInterface, readableShareRequestMessageFactory:ReadableShareRequestMessageFactoryInterface) {
		this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
		this._transferMessageCenter = transferMessageCenter;
		this._uploadFactory = uploadFactory;
		this._readableShareRequestFactory = readableShareRequestMessageFactory;

		this._setupListeners();
	}

	private _setupUploadByRequest (transferIdentifier:string, circuitIdOfRequest:string, requestMessage:ReadableShareRequestMessageInterface):void {

	}

	private _setupListeners ():void {
		this._transferMessageCenter.on('SHARE_REQUEST', (transferIdentifier:string, circuitIdOfMessage:string, msgPayload:Buffer) => {
			var requestMessage:ReadableShareRequestMessageInterface = this._readableShareRequestFactory.create(msgPayload);

			if (requestMessage) {
				this._setupUploadByRequest(transferIdentifier, circuitIdOfMessage, requestMessage);
			}
		});
	}
}

export = UploadManager;
