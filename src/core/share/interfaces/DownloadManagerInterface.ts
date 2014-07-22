import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.share.DownloadManagerInterface
 */
interface DownloadManagerInterface extends ClosableAsyncInterface {

	/**
	 * Triggers a manual abort for the specified download id. The download will be cleaned up after the network sent it's end event.
	 *
	 * @param {string} downloadId
	 */
	cancelDownload (downloadId:string):void;

	/**
	 * Creates a download for the given SHA hash
	 *
	 * @param {string} responseId
	 * @param {Function} callback
	 */
	createDownload (responseId:string, callback?:(err:Error) => any):void;

	/**
	 * Triggers the download `end event
	 *
	 * @param {string} downloadId
	 * @param {string} reason
	 */
	downloadEnded (downloadId:string, reason:string):void;

	/**
	 * Returns the download destination path or an error if no path is set or the current path is invalid
	 *
	 * @param {Function} callback The callback that gets called with a possible error and the destination path as arguments
	 */
	getDownloadDestination (callback:(err:Error, destinationPath:string) => any):void;

	/**
	 * A download was added and can be processed from the network layer
	 *
	 * @param {Function} listener
	 */
	onDownloadAdded (listener:(downloadId:string, fileName:string, fileSize:number, fileHash:string, destination:string, metadata:Object) => any):void;

	/**
	 * Registers a listener that gets called whenever a download was canceled
	 *
	 * @param {Funcion} listener
	 */
	onDownloadCanceled (listener:(downloadId:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a status of a running download changed.
	 *
	 * @param {Function} listener
	 */
	onDownloadStatusChanged (listener:(downloadId:string, status:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a running download receives a progress update.
	 *
	 * @param {Function} listener
	 */
	onDownloadProgressUpdate (listener:(downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number) => any):void;

	/**
	 * Registers a listener that gets called whenever a running download ended.
	 *
	 * @param {Function} listener
	 */
	onDownloadEnded (listener:(downloadId:string, reason:string) => any):void;

	/**
	 * Sets the download destination folder.
	 *
	 * @param {string} destinationPath An absolute path to the download destination folder
	 * @param {Fuction} callback
	 */
	setDownloadDestination (destinationPath:string, callback?:(err:Error) => any):void;

	/**
	 * Updates the progress of the specified download
	 *
	 * @param {string} downloadId
	 * @param {number} writtenBytes
	 * @param {number} fullCountOfExpectedBytes
	 */
	updateDownloadProgress (downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number):void;

	/**
	 * Updates the status of the specified download
	 *
	 * @param {string} downloadId
	 * @param {string} status
	 */
	updateDownloadStatus (downloadId:string, status:string):void;

}

export = DownloadManagerInterface;