var FileBlockWriter = require('./FileBlockWriter');

/**
* FileBlockWriterFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.FileBlockWriterFactory
* @implements core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface
*
* @param {string} downloadFolderPath Destination folder path for all created file block writers
*/
var FileBlockWriterFactory = (function () {
    function FileBlockWriterFactory(downloadFolderPath) {
        /**
        * @member {string} core.protocol.fileTransfer.share.FileBlockWriterFactory~_downloadFolderPath
        */
        this._downloadFolderPath = null;
        this._downloadFolderPath = downloadFolderPath;
    }
    FileBlockWriterFactory.prototype.createWriter = function (filename, expectedSize, expectedHash) {
        return new FileBlockWriter(filename, this._downloadFolderPath, expectedSize, expectedHash);
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
