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
	 * @param {string} toFolderPath Write file to folder
	 * @param {string} filename
	 * @param {number} expectedSize
	 * @param {string} expectedHash
	 * @parma {boolean} useDecompression Optional.
	 * @returns {core.fs.FileBlockWriterInterface}
	 */
	createWriter (toFolderPath:string, filename:string, expectedSize:number, expectedHash:string, useDecompression?:boolean):FileBlockWriterInterface;

}

export = FileBlockWriterFactoryInterface;