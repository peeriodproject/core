import fs = require('fs');
import path = require('path');

import DownloadManagerInterface = require('../../share/interfaces/DownloadManagerInterface');
import UiDownloadInterface = require('./interfaces/UiDownloadInterface');
import UiUploadInterface = require('./interfaces/UiUploadInterface');
import UploadManagerInterface = require('../../share/interfaces/UploadManagerInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiShareManagerComponent
 * @extends core.ui.UiComponent
 *
 * @param {core.share.DownloadManagerInterface} downloadManager
 */
class UiShareManagerComponent extends UiComponent {

	/**
	 * todo ts-definition
	 *
	 * @member {core.share.DownloadManagerInterface} core.ui.UiShareManagerComponent~_gui
	 */
	private _gui:any = null;

	/**
	 * The internally used download manger instance
	 *
	 * @member {core.share.DownloadManagerInterface} core.ui.UiShareManagerComponent~_downloadManager
	 */
	private _downloadManager:DownloadManagerInterface = null;

	private _progressRunnerTimeout:number = null;

	private _progressUpdated:boolean = null;

	private _runningDownloads:{ [identifier:string]:UiDownloadInterface; } = {};

	private _runningUploads:{ [identifier:string]:UiUploadInterface } = {};

	private _unmergedDownloadsWrittenBytes:{ [identifier:string]:number; } = {};

	private _uploadManager:UploadManagerInterface = null;

	constructor (gui:any, downloadManager:DownloadManagerInterface, uploadManager:UploadManagerInterface) {
		super();

		this._gui = gui;
		this._downloadManager = downloadManager;
		this._uploadManager = uploadManager;

		this._setupDownloadManagerEvents();
		this._setupUploadManagerEvents();
		this._setupUiDownloadEvents();
		this._setupUiUploadEvents();
	}

	public getEventNames ():Array<string> {
		return [
			'addDownload',
			'cancelDownload',
			'cancelUpload',
			'removeDownload',
			'removeUpload',
			'showDownloadDestination',
			'showDownload',
			'updateDownloadDestination'
		];
	}

	public getChannelName ():string {
		return 'share';
	}

	public getState (callback:(state:Object) => any):void {
		this._downloadManager.getDownloadDestination((err:Error, destination:string) => {
			var share = {
				downloads  : this._runningDownloads,
				uploads    : this._runningUploads,
				destination: {
					path : destination,
					error: (err ? { message: err.message, code: 'INVALID_PATH' } : null)
				}
			};

			return callback(share);
		});
	}

	private _setupDownloadManagerEvents ():void {
		this._downloadManager.onDownloadAdded((downloadId:string, fileName:string, fileSize:number, fileHash:string, destination:string, metadata:Object) => {
			this._runningDownloads[downloadId] = {
				created: new Date().getTime(),
				id     : downloadId,
				hash   : fileHash,
				loaded : 0,
				name   : fileName,
				size   : fileSize,
				status : 'CREATED',
				destination: destination
			};

			this._startProgressRunner();
			this.updateUi();
		});

		this._downloadManager.onDownloadProgressUpdate((downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number) => {
			if (!this._runningDownloads[downloadId]) {
				return;
			}

			this._unmergedDownloadsWrittenBytes[downloadId] = writtenBytes;
			this._progressUpdated = true;

			this._startProgressRunner();
		});

		this._downloadManager.onDownloadStatusChanged((downloadId:string, status:string) => {
			if (!this._runningDownloads[downloadId]) {
				return;
			}

			this._runningDownloads[downloadId].status = status;

			this.updateUi();
		});

		this._downloadManager.onDownloadEnded((downloadId:string, reason:string) => {
			if (!this._runningDownloads[downloadId]) {
				return;
			}

			this._runningDownloads[downloadId].status = reason;

			if (reason === 'COMPLETED') {
				this._runningDownloads[downloadId].loaded = this._runningDownloads[downloadId].size;
			}

			this.updateUi();
		});
	}

	private _setupUiDownloadEvents () {
		this.on('addDownload', (responseId:string, callback:Function) => {
			this._downloadManager.createDownload(responseId, (err) => {
				// todo clean up error message and add error codes
				var errMessage = err ? err.message : null;

				return callback(errMessage);
			});
		});

		this.on('cancelDownload', (downloadId:string) => {
			if (this._runningDownloads[downloadId]) {
				this._downloadManager.cancelDownload(downloadId);
			}
		});

		this.on('removeDownload', (downloadId:string) => {
			if (this._runningDownloads[downloadId]) {
				delete this._runningDownloads[downloadId];
				delete this._unmergedDownloadsWrittenBytes[downloadId];

				this.updateUi();
			}
		});

		this.on('showDownload', (downloadId:string) => {
			var download = this._runningDownloads[downloadId];
			var downloadPath = download ? path.join(download.destination, download.name) : null;

			if (!downloadPath) {
				return;
			}
			
			fs.exists(downloadPath, (exists:boolean) => {
				if (exists) {
					this._gui.Shell.showItemInFolder(downloadPath);
				}
			})
		});

		this.on('showDownloadDestination', () => {
			this._downloadManager.getDownloadDestination((err:Error, destination:string) => {
				if (!err) {
					this._gui.Shell.showItemInFolder(destination);
				}
			});
		});

		this.on('updateDownloadDestination', (destination:string) => {
			this._downloadManager.setDownloadDestination(destination, (err:Error) => {

				this.updateUi();
			});
		});
	}

	private _setupUiUploadEvents ():void {
		this.on('cancelUpload', (uploadId:string) => {
			if (this._runningUploads[uploadId]) {
				this._uploadManager.cancelUpload(uploadId);
			}
		});

		this.on('removeUpload', (uploadId:string) => {
			if (this._runningUploads[uploadId]) {
				delete this._runningUploads[uploadId];

				this.updateUi();
			}
		});
	}

	private _setupUploadManagerEvents ():void {
		this._uploadManager.onUploadAdded((uploadId:string, filePath:string, fileName:string, fileSize:number) => {
			this._runningUploads[uploadId] = {
				created: new Date().getTime(),
				id     : uploadId,
				path   : filePath,
				name   : fileName,
				size   : fileSize,
				status : 'CREATED'
			};

			this.updateUi();
		});

		this._uploadManager.onUploadStatusChanged((uploadId:string, status:string) => {
			if (!this._runningUploads[uploadId]) {
				return;
			}

			this._runningUploads[uploadId].status = status;
			this.updateUi();
		});

		this._uploadManager.onUploadEnded((uploadId:string, reason:string) => {
			if (!this._runningUploads[uploadId]) {
				return;
			}

			this._runningUploads[uploadId].status = reason;

			this.updateUi();
		});
	}

	private _startProgressRunner ():void {
		if (this._progressRunnerTimeout) {
			return;
		}


		this._progressRunnerTimeout = setTimeout(() => {
			var ids:Array<string>;

			this._progressRunnerTimeout = null;

			if (!this._progressUpdated) {
				return;
			}

			ids = Object.keys(this._unmergedDownloadsWrittenBytes);

			for (var i = 0, l = ids.length; i < l; i++) {
				var id = ids[i];

				this._runningDownloads[id].loaded = this._unmergedDownloadsWrittenBytes[id];
			}

			this._progressUpdated = false;

			this.updateUi();
			this._startProgressRunner();
		}, 500); // todo move interval delay to config
	}

}

export = UiShareManagerComponent;