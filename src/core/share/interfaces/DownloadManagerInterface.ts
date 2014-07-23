import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.share.DownloadManagerInterface
 */
interface DownloadManagerInterface extends ClosableAsyncInterface {

	/**
	 * Triggers a manual abort for the specified download id. The download will be cleaned up after the network sent it's end event.
	 *
	 * @method core.share.DownloadManagerInterface#cancelDownload
	 *
	 * @param {string} downloadId
	 */
	cancelDownload (downloadId:string):void;

	/**
	 * Creates a download for the given SHA hash
	 *
	 * @method core.share.DownloadManagerInterface#createDownload
	 *
	 * @param {string} responseId
	 * @param {Function} callback
	 */
	createDownload (responseId:string, callback?:(err:Error) => any):void;

	/**
	 * Triggers the download `end event
	 *
	 * @method core.share.DownloadManagerInterface#downloadEnded
	 *
	 * @param {string} downloadId
	 * @param {string} reason
	 */
	downloadEnded (downloadId:string, reason:string):void;

	/**
	 * Returns the download destination path or an error if no path is set or the current path is invalid
	 *
	 * @method core.share.DownloadManagerInterface#getDownloadDestination
	 *
	 * @param {Function} callback The callback that gets called with a possible error and the destination path as arguments
	 */
	getDownloadDestination (callback:(err:Error, destinationPath:string) => any):void;

	/**
	 * Returns a copy of the list of currently running download ids.
	 *
	 * @method core.share.DownloadManagerInterface#getRunningDownloadIds
	 *
	 * @param callback The callback with the copied list of download Ids as the first argument
	 */
	getRunningDownloadIds (callback:(downloadIdList:Array<string>) => any):void;

	/**
	 * A download was added and can be processed from the network layer
	 *
	 * @method core.share.DownloadManagerInterface#onDownloadAdded
	 *
	 * @param {Function} listener
	 */
	onDownloadAdded (listener:(downloadId:string, fileName:string, fileSize:number, fileHash:string, destination:string, metadata:Object) => any):void;

	/**
	 * Registers a listener that gets called whenever a download was canceled
	 *
	 * @method core.share.DownloadManagerInterface#onDownloadCanceled
	 *
	 * @param {Funcion} listener
	 */
	onDownloadCanceled (listener:(downloadId:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a status of a running download changed.
	 *
	 * @method core.share.DownloadManagerInterface#onDownloadStatusChanged
	 *
	 * @param {Function} listener
	 */
	onDownloadStatusChanged (listener:(downloadId:string, status:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a running download receives a progress update.
	 *
	 * @method core.share.DownloadManagerInterface#onDownloadProgressUpdate
	 *
	 * @param {Function} listener
	 */
	onDownloadProgressUpdate (listener:(downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number) => any):void;

	/**
	 * Registers a listener that gets called whenever a running download ended.
	 *
	 * @method core.share.DownloadManagerInterface#onDownloadEnded
	 *
	 * @param {Function} listener
	 */
	onDownloadEnded (listener:(downloadId:string, reason:string) => any):void;

	/**
	 * Sets the download destination folder.
	 *
	 * @method core.share.DownloadManagerInterface#setDownloadDestination
	 *
	 * @param {string} destinationPath An absolute path to the download destination folder
	 * @param {Fuction} callback
	 */
	setDownloadDestination (destinationPath:string, callback?:(err:Error) => any):void;

	/**
	 * Updates the progress of the specified download
	 *
	 * @method core.share.DownloadManagerInterface#updateDownloadProgress
	 *
	 * @param {string} downloadId
	 * @param {number} writtenBytes
	 * @param {number} fullCountOfExpectedBytes
	 */
	updateDownloadProgress (downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number):void;

	/**
	 * Updates the status of the specified download
	 *
	 * @method core.share.DownloadManagerInterface#updateDownloadStatus
	 *
	 * @param {string} downloadId
	 * @param {string} status
	 */
	updateDownloadStatus (downloadId:string, status:string):void;

}

export = DownloadManagerInterface;