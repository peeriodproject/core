import FileBlockWriterFactoryInterface = require('./interfaces/FileBlockWriterFactoryInterface');
import FileBlockWriterInterface = require('./interfaces/FileBlockWriterInterface');
import FileBlockWriter = require('./FileBlockWriter');
import InflatingFileBlockWriter = require('./InflatingFileBlockWriter');

/**
 * FileBlockWriterFactoryInterface implementation.
 *
 * @class core.fs.FileBlockWriterFactory
 * @implements core.fs.FileBlockWriterFactoryInterface
 */
class FileBlockWriterFactory implements FileBlockWriterFactoryInterface {


	public createWriter (toFolderPath:string, filename:string, expectedSize:number, expectedHash:string, useDecompression?:boolean):FileBlockWriterInterface {
		if (useDecompression) {
			return new InflatingFileBlockWriter(filename, toFolderPath, expectedSize, expectedHash);
		}
		else {
			return new FileBlockWriter(filename, toFolderPath, expectedSize, expectedHash);
		}
	}
}

export = FileBlockWriterFactory;