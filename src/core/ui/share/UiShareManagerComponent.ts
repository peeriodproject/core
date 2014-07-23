import DownloadManagerInterface = require('../../share/interfaces/DownloadManagerInterface');

import UiDownloadInterface = require('./interfaces/UiDownloadInterface');

import UiComponent = require('../UiComponent');

class UiShareManagerComponent extends UiComponent {

	private _downloadManager:DownloadManagerInterface = null;

	private _progressRunnerTimeout:number = null;

	private _progressUpdated:boolean = null;

	private _runningDownloads:{ [identifier:string]:UiDownloadInterface; } = {};
	private _unmergedDownloadsWrittenBytes:{ [identifier:string]:number; } = {};

	constructor (downloadManager:DownloadManagerInterface) {
		super();

		this._downloadManager = downloadManager;

		this._setupDownloadManagerEvents();
		this._setupUiEvents();
	}

	public getEventNames ():Array<string> {
		return ['addDownload', 'cancelDownload', 'removeDownload', 'updateDownloadDestination'];
	}

	public getChannelName ():string {
		return 'share';
	}

	public getState (callback:(state:Object) => any):void {
		this._downloadManager.getDownloadDestination((err:Error, destination:string) => {
			return callback({
				downloads: this._runningDownloads,
				destination: {
					path: destination,
					error: (err ? { message: err.message, code: 'INVALID_PATH' } : null)
				}
			});
		});
	}

	private _setupDownloadManagerEvents ():void {
		this._downloadManager.onDownloadAdded((downloadId:string, fileName:string, fileSize:number, fileHash:string, metadata:Object) => {
			this._runningDownloads[downloadId] = {
				created: new Date().getTime(),
				id: downloadId,
				hash: fileHash,
				loaded: Math.round(fileSize * Math.random()),
				name: fileName,
				size: fileSize,
				status: 'created'
			};

			this._startProgressRunner();
			this.updateUi();
		});

		this._downloadManager.onDownloadProgressUpdate((downloadId:string, writtenBytes:number) => {
			if (!this._runningDownloads[downloadId]) {
				return;
			}

			this._unmergedDownloadsWrittenBytes[downloadId] = writtenBytes;
			this._progressUpdated = true;
		});

		this._downloadManager.onDownloadStatusChanged((downloadId:string, status:string) => {
			if (!this._runningDownloads[downloadId]) {
				return;
			}

			this._runningDownloads[downloadId].status = status;
			this.updateUi();
		});

		this._downloadManager.onDownloadEnded((downloadId:string, reason:string) => {
			this._runningDownloads[downloadId].status = reason;
		});
	}

	private _setupUiEvents () {
		this.on('addDownload', (responseId:string) => {
			this._downloadManager.createDownload(responseId);
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

		this.on('updateDownloadDestination', (destination:string) => {
			this._downloadManager.setDownloadDestination(destination, (err:Error) => {

				this.updateUi();
			});
		});
	}

	private _startProgressRunner ():void {
		if (this._progressRunnerTimeout) {
			return;
		}

		this._progressRunnerTimeout = setTimeout(() => {
			var ids:Array<string>;

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
		}, 500);
	}

}

export = UiShareManagerComponent;