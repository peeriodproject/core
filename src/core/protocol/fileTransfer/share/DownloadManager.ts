import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');
import DownloadFactoryInterface = require('./interfaces/DownloadFactoryInterface');
import DownloadInterface = require('./interfaces/DownloadInterface');
import DownloadMap = require('./interfaces/DownloadMap');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import DownloadBridgeInterface = require('../../../share/interfaces/DownloadBridgeInterface');


class DownloadManager implements DownloadManagerInterface {

	private _downloadFactory:DownloadFactoryInterface = null;
	private _maximumNumberOfParallelDownloads:number = 0;
	private _activeDownloads:DownloadMap = {};
	private _bridge:DownloadBridgeInterface = null;
	private _circuitManager:CircuitManagerInterface = null;

	public constructor (transferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, downloadBridge:DownloadBridgeInterface, downloadFactory:DownloadFactoryInterface) {
		this._downloadFactory = downloadFactory;
		this._bridge = downloadBridge;
		this._maximumNumberOfParallelDownloads = transferConfig.get('fileTransfer.maximumNumberOfParallelDownloads');
		this._circuitManager = circuitManager;

		this._setupListeners();
	}

	private _canDownload ():string {
		var reason:string = null;

		if (Object.keys(this._activeDownloads).length >= this._maximumNumberOfParallelDownloads) {
			reason = 'MAX_DOWNLOADS_EXCEED';
		}
		else if (!this._circuitManager.getReadyCircuits().length) {
			reason = 'NO_ANON';
		}

		return reason;
	}

	private _setupListeners ():void {
		this._bridge.on('newDownload', (identifier:string, filename:string, filesize:number, filehash:string, locationMetadata:any) => {
			var reason:string = this._canDownload();

			if (!reason) {
				var download:DownloadInterface = this._downloadFactory.create(filename, filesize, filehash, locationMetadata);

				if (!download) {
					this._bridge.emit('end', identifier, 'BAD_METADATA');
				}
				else {
					this._addToActiveDownloads(identifier, download);
				}
			}
			else {
				this._bridge.emit('end', identifier, reason);
			}
		});

		this._bridge.on('abortDownload', (identifier:string) => {
			var activeDownload:DownloadInterface = this._activeDownloads[identifier];

			if (activeDownload) {
				activeDownload.manuallyAbort();
			}
		});
	}

	private _addToActiveDownloads (identifier:string, download:DownloadInterface):void {
		this._activeDownloads[identifier] = download;

		download.once('abort', () => {
			this._bridge.emit('manuallyAborted', identifier);
		});

		download.once('requestingFile', () => {
			this._bridge.emit('requestingFile', identifier);
		});

		download.once('startingTransfer', () => {
			this._bridge.emit('startingTransfer', identifier);
		});

		download.once('completed', () => {
			this._bridge.emit('completed', identifier);
		});

		download.on('writtenBytes', (numberOfWrittenBytes:number, fullCountOfExpectedBytes:number) => {
			this._bridge.emit('writtenBytes', identifier, numberOfWrittenBytes, fullCountOfExpectedBytes);
		});

		download.once('killed', (reason:string) => {
			var code:string = null;

			switch (reason) {
				case 'File cannot be written.':
					code = 'FS_ERROR';
					break;
				case 'Manually aborted.':
					code = 'MANUAL_ABORT';
					break;
				case 'Uploader aborted transfer.':
					code = 'REMOTE_ABORT';
					break;
				case 'Completed.':
					code = 'COMPLETED';
					break;
				case 'Maximum tries exhausted.':
					code = 'TIMED_OUT';
					break;
				default:
					if (reason.indexOf('FileBlockWriter') > -1) {
						code = 'FS_ERROR';
					}
					else {
						code = 'PROTOCOL_ERR';
					}
			};

			delete this._activeDownloads[identifier];

			this._bridge.emit('end', identifier, reason);
		});

	}
}

export = DownloadManager;