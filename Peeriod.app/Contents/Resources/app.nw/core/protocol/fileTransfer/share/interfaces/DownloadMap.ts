import DownloadInterface = require('./DownloadInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.DownloadMap
 */
interface DownloadMap {
	[identifier:string]:DownloadInterface;
}

export = DownloadMap;