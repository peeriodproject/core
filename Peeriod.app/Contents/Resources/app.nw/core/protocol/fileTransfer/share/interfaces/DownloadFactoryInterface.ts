/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import DownloadInterface = require('./DownloadInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.DownloadFactoryInterface
 */
interface DownloadFactoryInterface {

	/**
	 * Creates a download from the name, expected size and expected SHA-1 hash of the desired file. Moreover takes
	 * the location metadata received from a query response indicating how to contact the uploader.
	 *
	 * @method core.protocol.fileTransfer.share.DownloadFactoryInterface#create
	 *
	 * @param {string} downloadFolder The path of the folder to download the file to.
	 * @param {string} filename Name of the desired file.
	 * @param {number} expectedSize Expected number of bytes of the desired file.
	 * @param {string} expectedHash Expected SHA-1 hash of the desired file.
	 * @param {any} locationMetadata Metadata storing information about how to contact the uploader.
	 * @returns {core.protocol.fileTransfer.share.DownloadInterface}
	 */
	create (downloadFolder:string, filename:string, expectedSize:number, expectedHash:string, locationMetadata:any):DownloadInterface;
}

export = DownloadFactoryInterface;