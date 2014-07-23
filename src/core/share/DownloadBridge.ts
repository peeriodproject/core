/// <reference path='../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import DownloadBridgeInterface = require('./interfaces/DownloadBridgeInterface');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');

class DownloadBridge extends events.EventEmitter implements DownloadBridgeInterface {

	constructor (downloadManager:DownloadManagerInterface) {
		super();

		downloadManager.onDownloadAdded((downloadId:string, fileName:string, fileSize:number, fileHash:string, destination:string, metadata:Object) => {
			this.emit('newDownload', downloadId, fileName, fileSize, fileHash, destination, metadata);
		});

		downloadManager.onDownloadCanceled((downloadId:string) => {
			this.emit('abortDownload', downloadId);
		});

		// - - -

		this.on('writtenBytes', function (downloadId:string, numberOfWrittenBytes:number, fullCountOfExpectedBytes:number) {
			downloadManager.updateDownloadProgress(downloadId, numberOfWrittenBytes, fullCountOfExpectedBytes);
		});

		this.on('requestingFile', function (downloadId:string) {
			downloadManager.updateDownloadStatus(downloadId, 'REQUESTING_FILE');
		});

		this.on('startingTransfer', function (downloadId:string) {
			downloadManager.updateDownloadStatus(downloadId, 'TRANSFER_STARTED')
		});

		this.on('completed', function (downloadId:string) {
			downloadManager.updateDownloadStatus(downloadId, 'COMPLETED');
		});

		this.on('manuallyAborted', function (downloadId:string) {
			downloadManager.updateDownloadStatus(downloadId, 'MANUAL_ABORT');
		});

		this.on('end', function (downloadId:string, reason:string) {
			downloadManager.downloadEnded(downloadId, reason);
		});
	}
}

export = DownloadBridge;