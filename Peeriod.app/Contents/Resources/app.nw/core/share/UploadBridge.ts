/// <reference path='../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import UploadBridgeInterface = require('./interfaces/UploadBridgeInterface');
import UploadManagerInterface = require('./interfaces/UploadManagerInterface');

/**
 * @class core.share.UploadBridge
 * @extends events.EventEmitter
 * @implements core.share.UploadBridgeInterface
 *
 * @param {core.share.UploadManagerInterface} uploadManager
 */
class UploadBridge extends events.EventEmitter implements UploadBridgeInterface {

	private _uploadManager:UploadManagerInterface = null;

	constructor (uploadManager:UploadManagerInterface) {
		super();

		this._uploadManager = uploadManager;

		this.on('newUpload', (uploadId:string, fullFilePath:string, fileName:string, fileSize:number) => {
			this._uploadManager.createUpload(uploadId, fullFilePath, fileName, fileSize);
		});

		this.on('ratifyingRequest', (uploadId:string) => {
			this._uploadManager.updateUploadStatus(uploadId, 'RATIFYING_REQUEST');
		});

		this.on('startingUpload', (uploadId:string) => {
			this._uploadManager.updateUploadStatus(uploadId, 'UPLOAD_STARTED');
		});

		this.on('manuallyAborted', (uploadId:string) => {
			this._uploadManager.updateUploadStatus(uploadId, 'MANUAL_ABORT');
		});

		this.on('end', (uploadId:string, reason:string) => {
			this._uploadManager.uploadEnded(uploadId, reason);
		});

		this._uploadManager.onUploadCanceled((uploadId:string) => {
			this.emit('abortUpload', uploadId);
		});
	}

	public getFileInfoByHash (fileHash:string, callback:(err:Error, fullFilePath:string, fileName:string, fileSize:number) => any):void {
		return this._uploadManager.getFileInfoByHash(fileHash, callback);
	}
}

export = UploadBridge;