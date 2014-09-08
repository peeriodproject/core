var FileBlockReader = require('./FileBlockReader');
var DeflatingFileBlockReader = require('./DeflatingFileBlockReader');

/**
* @class core.fs.FileBlockReaderFactory
* @implements core.fs.FileBlockReaderFactoryInterface
*/
var FileBlockReaderFactory = (function () {
    function FileBlockReaderFactory() {
    }
    FileBlockReaderFactory.prototype.create = function (filePath, blockSize, useCompression) {
        if (useCompression) {
            return new DeflatingFileBlockReader(filePath, blockSize);
        } else {
            return new FileBlockReader(filePath, blockSize);
        }
    };
    return FileBlockReaderFactory;
})();

module.exports = FileBlockReaderFactory;
//# sourceMappingURL=FileBlockReaderFactory.js.map
