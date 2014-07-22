var fs = require('fs');
var zlib = require('zlib');

/**
* FileBlockReaderInterface implementation using zlib's deflate for compressing the read bytes.
*
* @class core.fs.DeflatingFileBlockReader
* @implements core.fs.FileBlockReaderInterface
*
* @param {string} filePath Full path of the file to read
* @param {number} blockSize Number of bytes to read in one block.
*/
var DeflatingFileBlockReader = (function () {
    function DeflatingFileBlockReader(filePath, blockSize) {
        /**
        * Stores the number of bytes in a block.
        *
        * @member {number} core.fs.FileBlockReader~_blockSize
        */
        this._blockSize = 0;
        /**
        * Indicates whether the file can be read or not.
        *
        * @member {boolean} core.fs.FileBlockReader~_canBeRead
        */
        this._canBeRead = false;
        /**
        * Stores the file descriptor to the opened file to read.
        *
        * @member {number} core.fs.FileBlockReader~_fileDescriptor
        */
        this._fileDescriptor = 0;
        /**
        * Stores the full path to the file to read
        *
        * @member {string} core.fs.FileBlockReader~_filePath
        */
        this._filePath = null;
        this._blockSize = blockSize;
        this._filePath = filePath;
    }
    DeflatingFileBlockReader.prototype.abort = function (callback) {
        if (this._canBeRead) {
            this._canBeRead = false;

            fs.close(this._fileDescriptor, function () {
                if (callback) {
                    callback(null);
                }
            });
        } else {
            process.nextTick(function () {
                if (callback) {
                    callback(new Error('FileBlockReader: Cannot abort closed file block reader'));
                }
            });
        }
    };

    DeflatingFileBlockReader.prototype.canBeRead = function () {
        return this._canBeRead;
    };

    DeflatingFileBlockReader.prototype.prepareToRead = function (callback) {
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

    DeflatingFileBlockReader.prototype.readBlock = function (fromPosition, callback) {
        var _this = this;
        if (this._canBeRead) {
            fs.read(this._fileDescriptor, new Buffer(this._blockSize), 0, this._blockSize, fromPosition, function (err, numOfReadBytes, buffer) {
                if (err) {
                    callback(err, null);
                } else {
                    var rawBuffer = numOfReadBytes < _this._blockSize ? buffer.slice(0, numOfReadBytes) : buffer;

                    zlib.deflateRaw(rawBuffer, function (err, compressedBuffer) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, compressedBuffer);
                        }
                    });
                }
            });
        } else {
            process.nextTick(function () {
                callback(new Error('FileBlockReader: Cannot read file.'), null);
            });
        }
    };
    return DeflatingFileBlockReader;
})();

module.exports = DeflatingFileBlockReader;
//# sourceMappingURL=DeflatingFileBlockReader.js.map
