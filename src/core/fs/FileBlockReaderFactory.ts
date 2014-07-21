import FileBlockReaderFactoryInterface = require('./interfaces/FileBlockReaderFactoryInterface');
import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');

import FileBlockReader = require('./FileBlockReader');

/**
 * @class core.fs.FileBlockReaderFactory
 * @implements core.fs.FileBlockReaderFactoryInterface
 */
class FileBlockReaderFactory implements FileBlockReaderFactoryInterface {

	create (filePath:string, blockSize:number):FileBlockReaderInterface {
		return new FileBlockReader(filePath, blockSize);
	}
}

export = FileBlockReaderFactory;