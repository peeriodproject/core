import UploadInterface = require('./DownloadInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.UploadMap
 */
interface UploadMap {
	[identifier:string]:UploadInterface;
}

export = UploadMap;