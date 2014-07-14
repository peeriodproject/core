import WritableShareAbortMessageFactoryInterface = require('./interfaces/WritableShareAbortMessageFactoryInterface');

/**
 * WritableShareAbortMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.WritableShareAbortMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface
 */
class WritableShareAbortMessageFactory implements WritableShareAbortMessageFactoryInterface {

	public constructMessage (filesize:number, filename:string, filehash:string):Buffer {
		var filesizeBuffer = new Buffer(8);

		filesizeBuffer.writeUInt32BE(Math.floor(filesize / 1000), 0);
		filesizeBuffer.writeUInt32BE(filesize % 1000, 4);

		var filenameBuffer = new Buffer(filename, 'utf8');
		var filehashBuffer = new Buffer(filehash, 'hex');

		return Buffer.concat([filesizeBuffer, filehashBuffer, filenameBuffer], filenameBuffer.length + 28);
	}
}

export = WritableShareAbortMessageFactory;