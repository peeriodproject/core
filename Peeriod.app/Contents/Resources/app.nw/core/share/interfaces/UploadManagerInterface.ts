import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.share.UploadManagerInterface
 */
interface UploadManagerInterface extends ClosableAsyncInterface {

	/**
	 * Triggers a manual abort for the specified upload id. The upload will be cleaned up after the network sent it's end event.
	 *
	 * @method core.share.UploadManagerInterface#cancelUpload
	 *
	 * @param {string} uploadId
	 */
	cancelUpload (uploadId:string):void;

	/**
	 * Creates a upload with the specified parameters. From now on the manager reacts to the specified `uploadId` member calls
	 * with same id.
	 *
	 * @param {string} uploadId
	 * @param {string} filePath
	 * @param {string} fileName
	 * @param {number} fileSize
	 */
	createUpload (uploadId:string, filePath:string, fileName:string, fileSize:number):void;

	/**
	 * Returns the corresponding file infos to the given fileHash
	 *
	 * @param {string} fileHash
	 * @param {Function} callback
	 */
	getFileInfoByHash (fileHash:string, callback:(err:Error, fullFilePath:string, filename:string, filesize:number) => any):void;

	/**
	 * Returns a copied list of currently running upload ids
	 *
	 * @param callback The callback with the list as the first argument
	 */
	getRunningUploadIds (callback:(uploadIdList:Array<string>) => any):void;

	/**
	 *
	 * @param callback
	 */
	onUploadAdded (callback:(uploadId:string, filePath:string, fileName:string, fileSize:number) => any):void;

	/**
	 * Registers a listener that gets called whenever a upload was canceled
	 *
	 * @method core.share.UploadManagerInterface#onUploadCanceled
	 *
	 * @param {Funcion} listener
	 */
	onUploadCanceled (listener:(uploadId:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a upload ended
	 *
	 * @method core.share.UploadManagerInterface#onUploadEnded
	 *
	 * @param {Function} listener
	 */
	onUploadEnded (listener:(uploadId:string, reason:string) => any):void;

	/**
	 * Registers a listener that gets called whenever a status of a running upload changed.
	 *
	 * @method core.share.UploadManagerInterface#onUploadStatusChanged
	 *
	 * @param {Function} listener
	 */
	onUploadStatusChanged (listener:(uploadId:string, status:string) => any):void;

	/**
	 * Updates the status of the specified upload id
	 *
	 * @method core.share.UploadManagerInterface#updateUploadStatus
	 *
	 * @param {string} uploadId
	 * @param {string} status
	 */
	updateUploadStatus (uploadId:string, status:string):void;

	/**
	 * Triggers the upload `end` event
	 *
	 * @method core.share.UploadManagerInterface#uploadEnded
	 *
	 * @param {string} uploadId
	 * @param {string} reason
	 */
	uploadEnded (uploadId:string, reason:string):void;

}

export = UploadManagerInterface;