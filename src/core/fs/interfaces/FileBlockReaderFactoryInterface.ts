import FileBlockReaderInterface = require('./FileBlockReaderInterface');

/**
 * @interface
 * @class core.fs.FileBlockReaderFactoryInterface
 */
interface FileBlockReaderFactoryInterface {

	/**
	 * Creates a {@link core.fs.FileBlockReaderInterface} for the specified file path and block size
	 *
	 * @method core.fs.FileBlockReaderFactoryInterface
	 *
	 * @param {string} filePath
	 * @param {number} blockSize
	 * @returns core.fs.FileBlockReaderInterface
	 */
	create (filePath:string, blockSize:number):FileBlockReaderInterface;

}

export = FileBlockReaderFactoryInterface;