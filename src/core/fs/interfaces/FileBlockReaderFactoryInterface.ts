import FileBlockReaderInterface = require('./FileBlockReaderInterface');

/**
 * @interface
 * @class core.fs.FileBlockReaderFactoryInterface
 */
interface FileBlockReaderFactoryInterface {

	/**
	 * Creates a {@link core.fs.FileBlockReaderInterface} for the specified file path and block size
	 * and optional DeflatRaw version of the block reader.
	 *
	 * @method core.fs.FileBlockReaderFactoryInterface
	 *
	 * @param {string} filePath
	 * @param {number} blockSize
	 * @param {boolean} useCompression Optional.
	 * @returns core.fs.FileBlockReaderInterface
	 */
	create (filePath:string, blockSize:number, useCompression?:boolean):FileBlockReaderInterface;

}

export = FileBlockReaderFactoryInterface;