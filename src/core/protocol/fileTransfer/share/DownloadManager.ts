import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');
import DownloadFactoryInterface = require('./interfaces/DownloadFactoryInterface');
import DownloadInterface = require('./interfaces/DownloadInterface');
import DownloadMap = require('./interfaces/DownloadMap');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import DownloadBridgeInterface = require('../../../share/interfaces/DownloadBridgeInterface');

/**
 * DownloadManagerInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.DownloadManager
 * @implements core.protocol.fileTransfer.share.DownloadManagerInterface
 *
 * @param {core.config.ConfigInterface} File transfer configuration
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager instance
 * @param {core.share.DownloadBridgeInterface} downloadBridge Bridge between network and frontend / database handling download issues.
 * @oaram {core.protocol.fileTransfer.share.DownloadFactoryInterface} downloadFactory Factory for creating downloads.
 */
class DownloadManager implements DownloadManagerInterface {

	/**
	 * Stores the currently active downloads under a identifier received from the bridge.
	 *
	 * @member {core.protocol.fileTransfer.share.DownloadMap} core.protocol.fileTransfer.share.DownloadManager~_activeDownloads
	 */
	private _activeDownloads:DownloadMap = {};

	/**
	 * Stores the download bridge.
	 *
	 * @member {core.share.DownloadBridgeInterface} core.protocol.fileTransfer.share.DownloadManager~_bridge
	 */
	private _bridge:DownloadBridgeInterface = null;

	/**
	 * Stores the hydra circuit manager
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.DownloadManager~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Stores the download factory.
	 *
	 * @member {core.protocol.fileTransfer.share.DownloadFactoryInterface} core.protocol.fileTransfer.share.DownloadManager~_downloadFactory
	 */
	private _downloadFactory:DownloadFactoryInterface = null;

	/**
	 * Stores the maximum number of parallel downloads a client can have. Populated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.share.DownloadManager~_maximumNumberOfParallelDownloads
	 */
	private _maximumNumberOfParallelDownloads:number = 0;

	public constructor (transferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, downloadBridge:DownloadBridgeInterface, downloadFactory:DownloadFactoryInterface) {
		this._downloadFactory = downloadFactory;
		this._bridge = downloadBridge;
		this._maximumNumberOfParallelDownloads = transferConfig.get('fileTransfer.maximumNumberOfParallelDownloads');
		this._circuitManager = circuitManager;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES
	 */

	public getActiveDownloads ():DownloadMap {
		return this._activeDownloads;
	}

	public getMaximumNumberOfDownloads ():number {
		return this._maximumNumberOfParallelDownloads;
	}

	/**
	 * END TESTING PURPOSES
	 */

	/**
	 * Adds a download the the currently active downloads list and binds the event listeners which propagate the
	 * download status to the bridge. Note: The event listeners do not need to be unbound, as this is done by the
	 * download in its private `_kill` method.
	 *
	 * @method core.protocol.fileTransfer.share.DownloadManager~_addToActiveDownloads
	 *
	 * @param {string} identifier The download's identifier received from the bridge.
	 * @param {core.protocol.fileTransfer.share.DownloadInterface} download The download to add to the active list.
	 */
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

			this._bridge.emit('end', identifier, code);
		});

	}

	/**
	 * Tells if a new download can be started. Requirements: New download may not exceed the maximum number of
	 * parallel downloads. Node must maintain at least one hydra circuit.
	 *
	 * If no new download can be started, a string indicating the reason (which can be propagated to the bridge) is returned,
	 * otherwise `null` is returned.
	 *
	 * @method core.protocol.fileTransfer.share.DownloadManager~_canDownload
	 *
	 * @returns {string} The reason for not being able to start a new download or `null` if a download can be started.
	 */
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

	/**
	 * Sets up the listeners on the bridge.
	 *
	 * @method core.protocol.fielTransfer.share.DownloadManager~_setupListeners
	 */
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

}

export = DownloadManager;