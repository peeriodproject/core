var fs = require('fs');

var FileBlockReader = (function () {
    function FileBlockReader(filePath, blockSize) {
        this._blockSize = 0;
        this._filePath = null;
        this._fileDescriptor = 0;
        this._canBeRead = false;
        this._blockSize = blockSize;
        this._filePath = filePath;
    }
    FileBlockReader.prototype.abort = function (callback) {
        if (this._canBeRead) {
            this._canBeRead = false;

            fs.close(this._fileDescriptor, function () {
                callback(null);
            });
        } else {
            process.nextTick(function () {
                callback(new Error('FileBlockReader: Cannot abort closed file block reader'));
            });
        }
    };

    FileBlockReader.prototype.prepareToRead = function (callback) {
        var _this = this;
        fs.open(this._filePath, 'r', function (err, fd) {
            if (err) {
                callback(err);
            } else {
                _this._canBeRead = true;
                _this._fileDescriptor = fd;
                callback(null);
            }
        });
    };

    FileBlockReader.prototype.readBlock = function (fromPosition, callback) {
        var _this = this;
        fs.read(this._fileDescriptor, new Buffer(this._blockSize), 0, this._blockSize, fromPosition, function (err, numOfReadBytes, buffer) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, numOfReadBytes < _this._blockSize ? buffer.slice(0, numOfReadBytes) : buffer);
            }
        });
    };
    return FileBlockReader;
})();

module.exports = FileBlockReader;
//# sourceMappingURL=FileBlockReader.js.map
