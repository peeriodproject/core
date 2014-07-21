var FileBlockReader = require('./FileBlockReader');

/**
* @class core.fs.FileBlockReaderFactory
* @implements core.fs.FileBlockReaderFactoryInterface
*/
var FileBlockReaderFactory = (function () {
    function FileBlockReaderFactory() {
    }
    FileBlockReaderFactory.prototype.create = function (filePath, blockSize) {
        return new FileBlockReader(filePath, blockSize);
    };
    return FileBlockReaderFactory;
})();

module.exports = FileBlockReaderFactory;
//# sourceMappingURL=FileBlockReaderFactory.js.map
