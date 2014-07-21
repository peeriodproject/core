/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import FileBlockWriterInterface = require('./FileBlockWriterInterface');

/**
 * @class
 * @interface core.fs.FileBlockWriterFactoryInterface
 */
interface FileBlockWriterFactoryInterface {

	/**
	 * Creates a file block writer with the provided parameters with optional InflateRaw version.
	 *
	 * @method core.fs.FileBlockWriterFactoryInterface#createWriter
	 *
	 * @param {string} filename
	 * @param {number} expectedSize
	 * @param {string} expectedHash
	 * @parma {boolean} useDecompression Optional.
	 * @returns {core.fs.FileBlockWriterInterface}
	 */
	createWriter (filename:string, expectedSize:number, expectedHash:string, useDecompression?:boolean):FileBlockWriterInterface;

	/**
	 * Returns the destination folder path for all created file block writers.
	 *
	 * @method core.fs.FileBlockWriterFactoryInterface#getDownloadFolderPath
	 *
	 * @returns {string} Path to the download folder
	 */
	getDownloadFolderPath ():string;

	/**
	 * Sets the destination folder path for all created file block writers.
	 *
	 * @method core.fs.FileBlockWriterFactoryInterface#setDownloadFolderPath
	 *
	 * @param {string} path Path to the download folder
	 */
	setDownloadFolderPath (path:string):void;

}

export = FileBlockWriterFactoryInterface;