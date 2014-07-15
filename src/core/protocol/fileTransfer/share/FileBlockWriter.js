var path = require('path');
var crypto = require('crypto');
var fs = require('fs');

var FileBlockWriter = (function () {
    function FileBlockWriter(filename, toFolderPath, expectedSize, expectedHash) {
        this._fullPath = null;
        this._expectedSize = null;
        this._expectedHash = null;
        this._canBeWritten = false;
        this._hashStream = null;
        this._fileDescriptor = null;
        this._fullCountOfWrittenBytes = 0;
        this._aborted = false;
        this._hashEnded = false;
        this._fileDeleted = false;
        this._expectedHash = expectedHash;
        this._expectedSize = expectedSize;
        this._fullPath = path.join(toFolderPath, filename);
    }
    FileBlockWriter.prototype.canBeWritten = function () {
        return this._canBeWritten;
    };

    FileBlockWriter.prototype.getFileDescriptor = function () {
        return this._fileDescriptor;
    };

    FileBlockWriter.prototype.abort = function (callback) {
        this._abort(true, callback);
    };

    FileBlockWriter.prototype.deleteFile = function (callback) {
        var _this = this;
        if (!this._fileDeleted) {
            fs.unlink(this._fullPath, function (err) {
                if (!err) {
                    _this._fileDeleted = true;
                    callback(null);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(null);
        }
    };

    FileBlockWriter.prototype.prepareToWrite = function (callback) {
        var _this = this;
        fs.open(this._fullPath, 'wx', function (err, fd) {
            if (err) {
                callback(err);
            } else {
                _this._fileDescriptor = fd;
                _this._hashStream = crypto.createHash('sha1');
                _this._canBeWritten = true;

                callback(null);
            }
        });
    };

    FileBlockWriter.prototype._abort = function (deleteFile, callback) {
        var _this = this;
        if (!this._aborted) {
            this._aborted = true;
            this._canBeWritten = false;

            if (!this._hashEnded) {
                this._hashEnded = true;
                this._hashStream.end();
            }

            fs.close(this._fileDescriptor, function () {
                if (deleteFile) {
                    _this.deleteFile(function () {
                        callback();
                    });
                } else {
                    callback();
                }
            });
        } else {
            callback();
        }
    };

    FileBlockWriter.prototype.writeBlock = function (byteBlock, callback) {
        var _this = this;
        if (!this._canBeWritten) {
            callback(new Error('FileBlockWriter: Cannot be written to.'));
            return;
        }

        var expectedBytesToWrite = byteBlock.length;
        var byteBlockToWrite = null;

        if (this._fullCountOfWrittenBytes + expectedBytesToWrite > this._expectedSize) {
            expectedBytesToWrite = this._expectedSize - this._fullCountOfWrittenBytes;
            byteBlockToWrite = byteBlock.slice(0, expectedBytesToWrite);
        } else {
            byteBlockToWrite = byteBlock;
        }

        fs.write(this._fileDescriptor, byteBlockToWrite, 0, expectedBytesToWrite, this._fullCountOfWrittenBytes, function (err, numOfBytesWritten, writtenBuffer) {
            if (err) {
                _this._abort(true, function () {
                    callback(err);
                });
            } else if (numOfBytesWritten !== expectedBytesToWrite) {
                _this._abort(true, function () {
                    callback(new Error('FileBlockWriter: Could not write all bytes. Aborting.'));
                });
            } else {
                _this._fullCountOfWrittenBytes += numOfBytesWritten;
                _this._hashStream.update(writtenBuffer);

                // check if we are done, if yes, digest hash and callback
                if (_this._fullCountOfWrittenBytes === _this._expectedSize) {
                    // we are done, digest hash
                    var calculatedHash = _this._hashStream.digest('hex');

                    _this._hashEnded = true;

                    if (calculatedHash === _this._expectedHash) {
                        // file is finished
                        _this._abort(false, function () {
                            callback(null, _this._fullCountOfWrittenBytes, true);
                        });
                    } else {
                        _this._abort(true, function () {
                            callback(new Error('FileBlockWriter: Hashes do not match.'), _this._fullCountOfWrittenBytes);
                        });
                    }
                } else {
                    callback(null, _this._fullCountOfWrittenBytes, false);
                }
            }
        });
    };
    return FileBlockWriter;
})();

module.exports = FileBlockWriter;
//# sourceMappingURL=FileBlockWriter.js.map
