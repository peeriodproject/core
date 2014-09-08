var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
var zlib = require('zlib');

/**
* FileBlockWriterInterface implementation using zlib's InflateRaw to decompress the buffer to write..
*
* @class core.fs.InflatingFileBlockWriter
* @implements core.fs.FileBlockWriterInterface
*
* @param {string} filename The name of the file to write
* @param {string} toFolderPath The destination folder of the file to write
* @param {number} expectedSize Number of expected bytes the file should have
* @param {string} expectedHash The expected SHA-1 hash of the file to write
*/
var InflatingFileBlockWriter = (function () {
    function InflatingFileBlockWriter(filename, toFolderPath, expectedSize, expectedHash) {
        /**
        * Flag indicating whether the block writer has been aborted.
        *
        * @member {boolean} core.fs.FileBlockWriter~_aborted
        */
        this._aborted = false;
        /**
        * Flag indicating whether the hash stream has been digested or ended manually.
        *
        * @member {boolean} core.fs.FileBlockWriter~_hashEnded
        */
        this._hashEnded = false;
        /**
        * Flag indicating whether the file can be written to or not.
        *
        * @member {boolean} core.fs.FileBlockWriter~_canBeWritten
        */
        this._canBeWritten = false;
        /**
        * Stores the expected SHA-1 hash of the file to write.
        *
        * @member {string} core.fs.FileBlockWriter~_expectedHash
        */
        this._expectedHash = null;
        /**
        * Stores the expected number of bytes of the file to write.
        *
        * @member {number} core.fs.FileBlockWriter~_expectedSize
        */
        this._expectedSize = null;
        /**
        * Flag indicating whether the destination file has been deleted or not.
        *
        * @member {boolean} core.fs.FileBlockWriter~_fileDeleted
        */
        this._fileDeleted = false;
        /**
        * Stores the file descriptor of the file to write.
        *
        * @member {number} core.fs.FileBlockWriter~_fileDescriptor
        */
        this._fileDescriptor = null;
        /**
        * Keeps track of the number of bytes that have already been written to the file and
        * thus indicates the position of the first byte of the next block.
        *
        * @member {number} core.fs.FileBlockWriter~_fullCountOfWrittenBytes
        */
        this._fullCountOfWrittenBytes = 0;
        /**
        * Stores the full path of the file to write.
        *
        * @member {string} core.fs.FileBlockWriter~_fullPath
        */
        this._fullPath = null;
        /**
        * Stores the SHA-1 hash stream which gets written to from block to block.
        *
        * @member {crypto.Hash} core.fs.FileBlockWriter~_hashStream
        */
        this._hashStream = null;
        this._expectedHash = expectedHash;
        this._expectedSize = expectedSize;
        this._fullPath = path.join(toFolderPath, filename);
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    InflatingFileBlockWriter.prototype.canBeWritten = function () {
        return this._canBeWritten;
    };

    InflatingFileBlockWriter.prototype.getFileDescriptor = function () {
        return this._fileDescriptor;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    InflatingFileBlockWriter.prototype.abort = function (callback) {
        this._abort(true, callback);
    };

    InflatingFileBlockWriter.prototype.deleteFile = function (callback) {
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
            process.nextTick(function () {
                callback(null);
            });
        }
    };

    InflatingFileBlockWriter.prototype.getFilePath = function () {
        return this._fullPath;
    };

    InflatingFileBlockWriter.prototype.prepareToWrite = function (callback) {
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

    InflatingFileBlockWriter.prototype.writeBlock = function (byteBlock, callback) {
        var _this = this;
        if (!this._canBeWritten) {
            process.nextTick(function () {
                callback(new Error('FileBlockWriter: Cannot be written to.'));
            });

            return;
        }

        zlib.inflateRaw(byteBlock, function (err, inflatedByteBlock) {
            if (err) {
                callback(err);
            } else {
                var expectedBytesToWrite = inflatedByteBlock.length;
                var byteBlockToWrite = null;

                if (_this._fullCountOfWrittenBytes + expectedBytesToWrite > _this._expectedSize) {
                    expectedBytesToWrite = _this._expectedSize - _this._fullCountOfWrittenBytes;
                    byteBlockToWrite = inflatedByteBlock.slice(0, expectedBytesToWrite);
                } else {
                    byteBlockToWrite = inflatedByteBlock;
                }

                fs.write(_this._fileDescriptor, byteBlockToWrite, 0, expectedBytesToWrite, _this._fullCountOfWrittenBytes, function (err, numOfBytesWritten, writtenBuffer) {
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
            }
        });
    };

    /**
    * Aborts the file transfer and cleans up everything (file descriptor, hash stream), then calls the callback.
    * Also sets the appropriate flags, so the file can no longer be written to.
    * If the block writer has already been aborted, immediately calls back and does nothing.
    *
    * @method core.fs.FileBlockWriter~_abort
    *
    * @param {boolean} deleteFile Flag indicating whether the destination file should be deleted.
    * @param {Function} callback Callback function when everything has been cleaned up.
    */
    InflatingFileBlockWriter.prototype._abort = function (deleteFile, callback) {
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
                        if (callback) {
                            callback();
                        }
                    });
                } else {
                    if (callback) {
                        callback();
                    }
                }
            });
        } else {
            if (callback) {
                process.nextTick(function () {
                    callback();
                });
            }
        }
    };
    return InflatingFileBlockWriter;
})();

module.exports = InflatingFileBlockWriter;
//# sourceMappingURL=InflatingFileBlockWriter.js.map
