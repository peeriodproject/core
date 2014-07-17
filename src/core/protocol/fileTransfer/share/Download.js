var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var crypto = require('crypto');
var events = require('events');

var HKDF = require('../../../crypto/HKDF');
var Padding = require('../../../crypto/Padding');

var Download = (function (_super) {
    __extends(Download, _super);
    function Download(filename, expectedSize, expectedHash, initialFeedingNodesBlockBufferOfUploader, feedingNodesBlockMaintainer, fileBlockWriterFactory, shareMessenger, transferMessageCenter, writableShareRequestFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockFactory, readableShareRatifyFactory, decrypter, encrypter, writableBlockRequestFactory) {
        _super.call(this);
        this._filename = null;
        this._expectedSize = 0;
        this._expectedHash = null;
        this._initialFeedingNodesBlockBufferOfUploader = null;
        this._feedingNodesBlockMaintainer = null;
        this._fileBlockWriter = null;
        this._shareMessenger = null;
        this._transferMessageCenter = null;
        this._writableShareRequestFactory = null;
        this._writableEncryptedShareFactory = null;
        this._readableEncryptedShareFactory = null;
        this._readableShareAbortFactory = null;
        this._readableShareRatifyFactory = null;
        this._writableShareAbortFactory = null;
        this._writableBlockRequestFactory = null;
        this._readableBlockFactory = null;
        this._decrypter = null;
        this._encrypter = null;
        this._killed = false;
        this._manuallyAborted = false;
        this._diffieHellman = null;
        this._incomingKey = null;
        this._outgoingKey = null;

        this._filename = filename;
        this._expectedSize = expectedSize;
        this._expectedHash = expectedHash;
        this._initialFeedingNodesBlockBufferOfUploader = initialFeedingNodesBlockBufferOfUploader;
        this._feedingNodesBlockMaintainer = feedingNodesBlockMaintainer;
        this._shareMessenger = shareMessenger;
        this._transferMessageCenter = transferMessageCenter;
        this._writableShareRequestFactory = writableShareRequestFactory;
        this._writableEncryptedShareFactory = writableEncryptedShareFactory;
        this._readableEncryptedShareFactory = readableEncryptedShareFactory;
        this._readableShareAbortFactory = readableShareAbortFactory;
        this._writableShareAbortFactory = writableShareAbortFactory;
        this._writableBlockRequestFactory = writableBlockRequestFactory;
        this._readableBlockFactory = readableBlockFactory;
        this._readableShareRatifyFactory = readableShareRatifyFactory;
        this._decrypter = decrypter;
        this._encrypter = encrypter;
        this._fileBlockWriter = fileBlockWriterFactory.createWriter(this._filename, this._expectedSize, this._expectedHash);
    }
    Download.prototype.kickOff = function () {
        var _this = this;
        // prepare the file block writer
        this._fileBlockWriter.prepareToWrite(function (err) {
            if (err) {
                _this._kill(false, true, false, 'File cannot be written.');
            } else {
                if (_this._manuallyAborted) {
                    _this._kill(true, true, false, 'Manually aborted.');
                } else {
                    _this._sendShareRequest();
                }
            }
        });
    };

    Download.prototype.manuallyAbort = function () {
        if (!this._manuallyAborted) {
            this._manuallyAborted = true;

            // only for internal stuff
            this.emit('internalAbort');

            // for external stuff, visual feedback etc.
            this.emit('abort');
        }
    };

    Download.prototype._sendShareRequest = function () {
        var _this = this;
        this.emit('requestingFile');

        this._diffieHellman = crypto.getDiffieHellman('modp14');
        var dhPublicKey = Padding.pad(this._diffieHellman.generateKeys(), 256);
        var transferIdentifier = crypto.pseudoRandomBytes(16).toString('hex');

        this._prepareToImmediateShare(function (err) {
            if (err) {
                _this._kill(true, true, false, err.message);
            } else {
                var payload = _this._transferMessageCenter.wrapTransferMessage('SHARE_REQUEST', transferIdentifier, _this._writableShareRequestFactory.constructMessage(_this._feedingNodesBlockMaintainer.getBlock(), _this._expectedHash, dhPublicKey));

                _this._shareMessenger.pipeMessageAndWaitForResponse(payload, _this._initialFeedingNodesBlockBufferOfUploader, 'SHARE_RATIFY', transferIdentifier, function (err, responsePayload) {
                    if (err) {
                        _this._kill(true, true, false, err.message);
                    } else {
                        _this._handleRatifyMessage(responsePayload, new Buffer(transferIdentifier, 'hex'));
                    }
                });
            }
        });
    };

    Download.prototype._sendBlockRequest = function (bytePosition, transferIdentToUse, nodesToFeedBlock, isLast) {
        var _this = this;
        if (typeof isLast === "undefined") { isLast = false; }
        this._prepareToImmediateShare(function (err) {
            if (err && !isLast) {
                _this._kill(true, true, true, err.message, transferIdentToUse, nodesToFeedBlock);
            } else {
                var nextTransferIdentifier = crypto.pseudoRandomBytes(16).toString('hex');
                var blockRequestClear = _this._writableEncryptedShareFactory.constructMessage('BLOCK_REQUEST', _this._writableBlockRequestFactory.constructMessage(_this._feedingNodesBlockMaintainer.getBlock(), bytePosition, nextTransferIdentifier));

                _this._encrypter.encryptMessage(_this._outgoingKey, true, blockRequestClear, function (err, encryptedBuffer) {
                    var sendableBuffer = err ? null : _this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', transferIdentToUse, encryptedBuffer);

                    if (isLast) {
                        if (sendableBuffer) {
                            // if this is the last message, i.e. last acknowledge message, ignore any abort, as we are done anyway
                            _this._shareMessenger.pipeLastMessage(sendableBuffer, nodesToFeedBlock);
                        }
                        _this._kill(false, true, false, 'Completed.');
                    } else {
                        var errorMessage = err ? 'Encryption error.' : null;
                        errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

                        if (errorMessage) {
                            _this._kill(true, true, true, errorMessage, transferIdentToUse, nodesToFeedBlock);
                        } else {
                            _this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, nodesToFeedBlock, 'ENCRYPTED_SHARE', nextTransferIdentifier, function (err, responsePayload) {
                                if (err) {
                                    _this._kill(true, true, false, err.message);
                                } else {
                                    _this._handleBlockMessage(responsePayload, bytePosition);
                                }
                            });
                        }
                    }
                });
            }
        });
    };

    Download.prototype._handleBlockMessage = function (payload, expectedBytePosition) {
        var _this = this;
        var decryptedMessage = null;
        var malformedMessageErr = null;

        try  {
            decryptedMessage = this._decrypter.create(payload, this._incomingKey);
        } catch (e) {
            malformedMessageErr = 'Decryption error.';
        }

        if (decryptedMessage) {
            var shareMessage = this._readableEncryptedShareFactory.create(decryptedMessage.getPayload());

            if (!shareMessage) {
                malformedMessageErr = 'Malformed share message.';
            } else {
                if (shareMessage.getMessageType() === 'SHARE_ABORT') {
                    var shareAbortMessage = this._readableShareAbortFactory.create(shareMessage.getPayload());

                    if (!shareAbortMessage) {
                        malformedMessageErr = 'Malformed abort message.';
                    } else if (!(shareAbortMessage.getFileHash() === this._expectedHash && shareAbortMessage.getFilename() === this._filename && shareAbortMessage.getFilesize() === this._expectedSize)) {
                        malformedMessageErr = 'File properties do not match in abort message.';
                    } else {
                        malformedMessageErr = 'Uploader aborted transfer.';
                    }
                } else if (shareMessage.getMessageType() === 'BLOCK') {
                    var blockMessage = this._readableBlockFactory.create(shareMessage.getPayload());

                    if (!blockMessage || blockMessage.getFirstBytePositionOfBlock() !== expectedBytePosition) {
                        malformedMessageErr = 'Malformed block message.';
                    } else {
                        if (this._manuallyAborted) {
                            this._kill(true, true, true, 'Manually aborted.', blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
                        } else {
                            // everything okay so for. pass to the file writer.
                            this._fileBlockWriter.writeBlock(blockMessage.getDataBlock(), function (err, fullCountOfWrittenBytes, isFinished) {
                                if (isFinished) {
                                    // finalize it
                                    _this._sendBlockRequest(fullCountOfWrittenBytes, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock(), true);

                                    if (!_this._manuallyAborted) {
                                        _this.emit('completed');
                                    }
                                } else {
                                    var errorMessage = err ? err.message : null;
                                    errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

                                    if (errorMessage) {
                                        _this._kill(true, true, true, errorMessage, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
                                    } else {
                                        _this.emit('writtenBytes', fullCountOfWrittenBytes);
                                        _this._sendBlockRequest(fullCountOfWrittenBytes, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
                                    }
                                }
                            });
                        }
                    }
                } else {
                    malformedMessageErr = 'Prohibited message type.';
                }
            }
        }

        if (malformedMessageErr) {
            this._kill(true, true, false, malformedMessageErr);
            this._shareMessenger.teardownLatestCircuit();
        }
    };

    Download.prototype._handleRatifyMessage = function (payload, prevTransferIdent) {
        var ratifyMessage = this._readableShareRatifyFactory.create(payload);
        var malformedMessageErr = null;

        if (!ratifyMessage) {
            malformedMessageErr = 'Malformed message.';
        } else {
            var secret = this._diffieHellman.computeSecret(ratifyMessage.getDHPayload());
            var sha1 = crypto.createHash('sha1').update(secret).digest('hex');

            if (sha1 !== ratifyMessage.getSecretHash().toString('hex')) {
                malformedMessageErr = 'Hashes of secret do not match.';
            } else {
                // derive keys and the identifier
                var hkdf = new HKDF('sha256', secret);
                var keysConcat = hkdf.derive(48, prevTransferIdent);

                this._outgoingKey = keysConcat.slice(0, 16);
                this._incomingKey = keysConcat.slice(16, 32);

                var nextTransferIdentifier = keysConcat.slice(32).toString('hex');

                // decrypt the encrypted part
                var decryptedPart = null;

                try  {
                    decryptedPart = this._decrypter.create(ratifyMessage.getEncryptedPart(), this._incomingKey);
                } catch (e) {
                    malformedMessageErr = 'Decryption error.';
                }

                if (decryptedPart) {
                    var deformatted = false;

                    try  {
                        ratifyMessage.deformatDecryptedPart(decryptedPart.getPayload());
                        deformatted = true;
                    } catch (e) {
                        malformedMessageErr = 'Malformed decrypted message.';
                    }

                    if (deformatted) {
                        var nodesToFeedBlock = ratifyMessage.getDeformattedDecryptedFeedingNodesBlock();
                        var filename = ratifyMessage.getDeformattedDecryptedFilename();
                        var size = ratifyMessage.getDeformattedDecryptedFileSize();

                        if (!(filename === this._filename && size === this._expectedSize)) {
                            malformedMessageErr = 'Filename and size do not match requested file.';
                        } else {
                            // everything is well, now only check if shit has been aborted
                            if (this._manuallyAborted) {
                                this._kill(true, true, true, 'Manually aborted.', nextTransferIdentifier, nodesToFeedBlock);
                            } else {
                                // fine until here, begin requesting the blocks
                                this.emit('startingTransfer');
                                this._sendBlockRequest(0, nextTransferIdentifier, nodesToFeedBlock);
                            }
                        }
                    }
                }
            }
        }

        if (malformedMessageErr) {
            this._kill(true, true, false, malformedMessageErr);
            this._shareMessenger.teardownLatestCircuit();
        }
    };

    Download.prototype._prepareToImmediateShare = function (callback) {
        var _this = this;
        if (this._feedingNodesBlockMaintainer.getCurrentNodeBatch().length) {
            callback(null);
        } else {
            var nodeBatchLengthListener = function () {
                _this.removeAllListeners('internalAbort');
                callback(null);
            };

            this.once('internalAbort', function () {
                _this._feedingNodesBlockMaintainer.removeListener('nodeBatchLength', nodeBatchLengthListener);
                callback(new Error('Manually aborted.'));
            });

            this._feedingNodesBlockMaintainer.once('nodeBatchLength', nodeBatchLengthListener);
        }
    };

    Download.prototype._kill = function (abortFileWriter, abortBlockMaintainer, sendLastAbortMessage, message, lastMessageIdentifier, lastMessageNodesToFeedBlock) {
        var _this = this;
        if (!this._killed) {
            this._killed = true;

            if (abortFileWriter) {
                this._fileBlockWriter.abort(null);
            }
            if (abortBlockMaintainer) {
                this._feedingNodesBlockMaintainer.cleanup();
            }
            if (sendLastAbortMessage) {
                var lastMessageClearText = this._writableEncryptedShareFactory.constructMessage('SHARE_ABORT', this._writableShareAbortFactory.constructMessage(this._expectedSize, this._filename, this._expectedHash));

                this._encrypter.encryptMessage(this._outgoingKey, true, lastMessageClearText, function (err, encryptedPayload) {
                    if (!err) {
                        var payloadToFeed = _this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', lastMessageIdentifier, encryptedPayload);
                        _this._shareMessenger.pipeLastMessage(payloadToFeed, lastMessageNodesToFeedBlock);
                    }
                });
            }

            this.removeAllListeners('internalAbort');
            this.removeAllListeners('abort');
            this.removeAllListeners('startingTransfer');
            this.removeAllListeners('requestingFile');
            this.removeAllListeners('completed');

            this.emit('killed', message);

            this.removeAllListeners('killed');
        }
    };
    return Download;
})(events.EventEmitter);

module.exports = Download;
//# sourceMappingURL=Download.js.map
