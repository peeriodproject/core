/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import FileBlockWriterInterface = require('./FileBlockWriterInterface');

/**
 * @class
 * @interface core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface
 */
interface FileBlockWriterFactoryInterface {

	/**
	 * Creates a file block writer with the provided parameters.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface#createWriter
	 *
	 * @param {string} filename
	 * @param {number} expectedSize
	 * @param {string} expectedHash
	 * @returns {core.protocol.fileTransfer.share.FileBlockWriterInterface}
	 */
	createWriter (filename:string, expectedSize:number, expectedHash:string):FileBlockWriterInterface;

	/**
	 * Returns the destination folder path for all created file block writers.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface#getDownloadFolderPath
	 *
	 * @returns {string} Path to the download folder
	 */
	getDownloadFolderPath ():string;

	/**
	 * Sets the destination folder path for all created file block writers.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface#setDownloadFolderPath
	 *
	 * @param {string} path Path to the download folder
	 */
	setDownloadFolderPath (path:string):void;

}

export = FileBlockWriterFactoryInterface;