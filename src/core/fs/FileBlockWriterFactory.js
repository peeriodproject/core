var FileBlockWriter = require('./FileBlockWriter');
var InflatingFileBlockWriter = require('./InflatingFileBlockWriter');

/**
* FileBlockWriterFactoryInterface implementation.
*
* @class core.fs.FileBlockWriterFactory
* @implements core.fs.FileBlockWriterFactoryInterface
*
* @param {string} downloadFolderPath Destination folder path for all created file block writers
*/
var FileBlockWriterFactory = (function () {
    function FileBlockWriterFactory(downloadFolderPath) {
        /**
        * @member {string} core.fs.FileBlockWriterFactory~_downloadFolderPath
        */
        this._downloadFolderPath = null;
        this._downloadFolderPath = downloadFolderPath;
    }
    FileBlockWriterFactory.prototype.createWriter = function (filename, expectedSize, expectedHash, useDecompression) {
        if (useDecompression) {
            return new InflatingFileBlockWriter(filename, this._downloadFolderPath, expectedSize, expectedHash);
        } else {
            return new FileBlockWriter(filename, this._downloadFolderPath, expectedSize, expectedHash);
        }
    };

    FileBlockWriterFactory.prototype.getDownloadFolderPath = function () {
        return this._downloadFolderPath;
    };

    FileBlockWriterFactory.prototype.setDownloadFolderPath = function (path) {
        this._downloadFolderPath = path;
    };
    return FileBlockWriterFactory;
})();

module.exports = FileBlockWriterFactory;
//# sourceMappingURL=FileBlockWriterFactory.js.map
