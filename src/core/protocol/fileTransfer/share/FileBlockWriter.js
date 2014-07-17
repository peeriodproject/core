var path = require('path');
var crypto = require('crypto');
var fs = require('fs');

/**
* FileBlockWriterInterface implementation.
*
* @class core.protocol.fileTransfer.share.FileBlockWriter
* @implements core.protocol.fileTransfer.share.FileBlockWriterInterface
*
* @param {string} filename The name of the file to write
* @param {string} toFolderPath The destination folder of the file to write
* @param {number} expectedSize Number of expected bytes the file should have
* @param {string} expectedHash The expected SHA-1 hash of the file to write
*/
var FileBlockWriter = (function () {
    function FileBlockWriter(filename, toFolderPath, expectedSize, expectedHash) {
        /**
        * Flag indicating whether the block writer has been aborted.
        *
        * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_aborted
        */
        this._aborted = false;
        /**
        * Flag indicating whether the hash stream has been digested or ended manually.
        *
        * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_hashEnded
        */
        this._hashEnded = false;
        /**
        * Flag indicating whether the file can be written to or not.
        *
        * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_canBeWritten
        */
        this._canBeWritten = false;
        /**
        * Stores the expected SHA-1 hash of the file to write.
        *
        * @member {string} core.protocol.fileTransfer.share.FileBlockWriter~_expectedHash
        */
        this._expectedHash = null;
        /**
        * Stores the expected number of bytes of the file to write.
        *
        * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_expectedSize
        */
        this._expectedSize = null;
        /**
        * Flag indicating whether the destination file has been deleted or not.
        *
        * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_fileDeleted
        */
        this._fileDeleted = false;
        /**
        * Stores the file descriptor of the file to write.
        *
        * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_fileDescriptor
        */
        this._fileDescriptor = null;
        /**
        * Keeps track of the number of bytes that have already been written to the file and
        * thus indicates the position of the first byte of the next block.
        *
        * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_fullCountOfWrittenBytes
        */
        this._fullCountOfWrittenBytes = 0;
        /**
        * Stores the full path of the file to write.
        *
        * @member {string} core.protocol.fileTransfer.share.FileBlockWriter~_fullPath
        */
        this._fullPath = null;
        /**
        * Stores the SHA-1 hash stream which gets written to from block to block.
        *
        * @member {crypto.Hash} core.protocol.fileTransfer.share.FileBlockWriter~_hashStream
        */
        this._hashStream = null;
        this._expectedHash = expectedHash;
        this._expectedSize = expectedSize;
        this._fullPath = path.join(toFolderPath, filename);
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    FileBlockWriter.prototype.canBeWritten = function () {
        return this._canBeWritten;
    };

    FileBlockWriter.prototype.getFileDescriptor = function () {
        return this._fileDescriptor;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
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
            process.nextTick(function () {
                callback(null);
            });
        }
    };

    FileBlockWriter.prototype.getFilePath = function () {
        return this._fullPath;
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

    FileBlockWriter.prototype.writeBlock = function (byteBlock, callback) {
        var _this = this;
        if (!this._canBeWritten) {
            process.nextTick(function () {
                callback(new Error('FileBlockWriter: Cannot be written to.'));
            });

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

    /**
    * Aborts the file transfer and cleans up everything (file descriptor, hash stream), then calls the callback.
    * Also sets the appropriate flags, so the file can no longer be written to.
    * If the block writer has already been aborted, immediately calls back and does nothing.
    *
    * @method core.protocol.fileTransfer.share.FileBlockWriter~_abort
    *
    * @param {boolean} deleteFile Flag indicating whether the destination file should be deleted.
    * @param {Function} callback Callback function when everything has been cleaned up.
    */
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
    return FileBlockWriter;
})();

module.exports = FileBlockWriter;
//# sourceMappingURL=FileBlockWriter.js.map
