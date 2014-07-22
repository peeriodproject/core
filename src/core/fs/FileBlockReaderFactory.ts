import FileBlockReaderFactoryInterface = require('./interfaces/FileBlockReaderFactoryInterface');
import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');

import FileBlockReader = require('./FileBlockReader');
import DeflatingFileBlockReader = require('./DeflatingFileBlockReader');

/**
 * @class core.fs.FileBlockReaderFactory
 * @implements core.fs.FileBlockReaderFactoryInterface
 */
class FileBlockReaderFactory implements FileBlockReaderFactoryInterface {

	create (filePath:string, blockSize:number, useCompression?:boolean):FileBlockReaderInterface {
		if (useCompression) {
			return new DeflatingFileBlockReader(filePath, blockSize);
		}
		else {
			return new FileBlockReader(filePath, blockSize);
		}
	}
}

export = FileBlockReaderFactory;