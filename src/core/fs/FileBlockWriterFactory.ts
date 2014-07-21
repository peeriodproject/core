import FileBlockWriterFactoryInterface = require('./interfaces/FileBlockWriterFactoryInterface');
import FileBlockWriterInterface = require('./interfaces/FileBlockWriterInterface');
import FileBlockWriter = require('./FileBlockWriter');
import InflatingFileBlockWriter = require('./InflatingFileBlockWriter');

/**
 * FileBlockWriterFactoryInterface implementation.
 *
 * @class core.fs.FileBlockWriterFactory
 * @implements core.fs.FileBlockWriterFactoryInterface
 *
 * @param {string} downloadFolderPath Destination folder path for all created file block writers
 */
class FileBlockWriterFactory implements FileBlockWriterFactoryInterface {

	/**
	 * @member {string} core.fs.FileBlockWriterFactory~_downloadFolderPath
	 */
	private _downloadFolderPath:string = null;

	public constructor (downloadFolderPath:string) {
		this._downloadFolderPath = downloadFolderPath;
	}

	public createWriter (filename:string, expectedSize:number, expectedHash:string, useDecompression?:boolean):FileBlockWriterInterface {
		if (useDecompression) {
			return new InflatingFileBlockWriter(filename, this._downloadFolderPath, expectedSize, expectedHash);
		}
		else {
			return new FileBlockWriter(filename, this._downloadFolderPath, expectedSize, expectedHash);
		}
	}

	public getDownloadFolderPath ():string {
		return this._downloadFolderPath;
	}

	public setDownloadFolderPath (path:string):void {
		this._downloadFolderPath = path;
	}

}

export = FileBlockWriterFactory;