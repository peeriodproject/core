var FileBlockWriter = require('./FileBlockWriter');
var InflatingFileBlockWriter = require('./InflatingFileBlockWriter');

/**
* FileBlockWriterFactoryInterface implementation.
*
* @class core.fs.FileBlockWriterFactory
* @implements core.fs.FileBlockWriterFactoryInterface
*/
var FileBlockWriterFactory = (function () {
    function FileBlockWriterFactory() {
    }
    FileBlockWriterFactory.prototype.createWriter = function (toFolderPath, filename, expectedSize, expectedHash, useDecompression) {
        if (useDecompression) {
            return new InflatingFileBlockWriter(filename, toFolderPath, expectedSize, expectedHash);
        } else {
            return new FileBlockWriter(filename, toFolderPath, expectedSize, expectedHash);
        }
    };
    return FileBlockWriterFactory;
})();

module.exports = FileBlockWriterFactory;
//# sourceMappingURL=FileBlockWriterFactory.js.map
