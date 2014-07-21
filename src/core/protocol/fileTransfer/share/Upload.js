var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var HKDF = require('../../../crypto/HKDF');
var Padding = require('../../../crypto/Padding');

var Upload = (function (_super) {
    __extends(Upload, _super);
    function Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, feedingNodesBlockMaintainer, transferMessageCenter, writableShareRatifyFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockRequestFactory, writableBlockFactory, decrypter, encrypter) {
        _super.call(this);
        this._filename = null;
        this._filesize = 0;
        this._filehash = null;
        this._initialFeedingNodesBlockOfDownloader = null;
        this._fileReader = null;
        this._shareMessenger = null;
        this._downloaderDHPayload = null;
        this._feedingNodesBlockMaintainer = null;
        this._transferMessageCenter = null;
        this._writableShareRatifyFactory = null;
        this._writableEncryptedShareFactory = null;
        this._readableEncryptedShareFactory = null;
        this._readableShareAbortFactory = null;
        this._writableShareAbortFactory = null;
        this._readableBlockRequestFactory = null;
        this._writableBlockFactory = null;
        this._decrypter = null;
        this._encrypter = null;
        this._requestTransferIdentifier = null;
        this._incomingKey = null;
        this._outgoingKey = null;
        this._killed = false;
        this._manuallyAborted = false;
        this._fdOpen = false;

        this._filename = filename;
        this._filesize = filesize;
        this._filehash = filehash;
        this._initialFeedingNodesBlockOfDownloader = shareRequest.getFeedingNodesBlock();
        this._fileReader = fileReader;
        this._downloaderDHPayload = shareRequest.getDHPayload();
        this._shareMessenger = shareMessenger;
        this._feedingNodesBlockMaintainer = feedingNodesBlockMaintainer;
        this._transferMessageCenter = transferMessageCenter;
        this._writableShareRatifyFactory = writableShareRatifyFactory;
        this._writableEncryptedShareFactory = writableEncryptedShareFactory;
        this._readableEncryptedShareFactory = readableEncryptedShareFactory;
        this._readableShareAbortFactory = readableShareAbortFactory;
        this._writableShareAbortFactory = writableShareAbortFactory;
        this._readableBlockRequestFactory = readableBlockRequestFactory;
        this._writableBlockFactory = writableBlockFactory;
        this._requestTransferIdentifier = requestTransferIdentifier;
        this._decrypter = decrypter;
        this._encrypter = encrypter;
    }
    Upload.prototype.kickOff = function () {
        this._sendShareRatify();
    };

    Upload.prototype.manuallyAbort = function () {
        if (!this._manuallyAborted && !this._killed) {
            this._manuallyAborted = true;

            // only for internal stuff
            this.emit('internalAbort');

            // for external stuff, visual feedback etc.
            this.emit('abort');
        }
    };

    Upload.prototype._kill = function (sendLastAbortMessage, message, lastMessageIdentifier, lastMessageNodesToFeedBlock) {
        var _this = this;
        if (!this._killed) {
            this._killed = true;

            if (this._fileReader.canBeRead()) {
                this._fileReader.abort(null);
            }

            this._feedingNodesBlockMaintainer.cleanup();

            if (sendLastAbortMessage) {
                var lastMessageClearText = this._writableEncryptedShareFactory.constructMessage('SHARE_ABORT', this._writableShareAbortFactory.constructMessage(this._filesize, this._filename, this._filehash));

                this._encrypter.encryptMessage(this._outgoingKey, true, lastMessageClearText, function (err, encryptedPayload) {
                    if (!err) {
                        var payloadToFeed = _this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', lastMessageIdentifier, encryptedPayload);
                        _this._shareMessenger.pipeLastMessage(payloadToFeed, lastMessageNodesToFeedBlock);
                    }
                });
            }

            this.removeAllListeners('internalAbort');
            this.removeAllListeners('abort');
            this.removeAllListeners('ratifyingRequest');

            this.emit('killed', message);

            this.removeAllListeners('killed');
        }
    };

    Upload.prototype._prepareToImmediateShare = function (callback) {
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

    Upload.prototype._handleMessengerResponse = function (err, responsePayload) {
        var _this = this;
        if (err) {
            this._kill(false, err.message);
        } else {
            var decryptedMessage = this._decrypter.create(responsePayload, this._incomingKey);
            var malformedMessageErr = null;
            var teardownOnError = true;

            if (!decryptedMessage) {
                malformedMessageErr = 'Decryption error.';
            } else {
                var shareMessage = this._readableEncryptedShareFactory.create(decryptedMessage.getPayload());

                if (!shareMessage) {
                    malformedMessageErr = 'Malformed share message.';
                } else {
                    if (shareMessage.getMessageType() === 'SHARE_ABORT') {
                        var shareAbortMessage = this._readableShareAbortFactory.create(shareMessage.getPayload());

                        if (!shareAbortMessage) {
                            malformedMessageErr = 'Malformed abort message.';
                        } else if (!(shareAbortMessage.getFileHash() === this._filehash && shareAbortMessage.getFilename() === this._filename && shareAbortMessage.getFilesize() === this._filesize)) {
                            malformedMessageErr = 'File properties do not match in abort message.';
                        } else {
                            malformedMessageErr = 'Downloader aborted transfer.';
                            teardownOnError = false;
                        }
                    } else if (shareMessage.getMessageType() === 'BLOCK_REQUEST') {
                        var blockRequest = this._readableBlockRequestFactory.create(shareMessage.getPayload());

                        if (!blockRequest || blockRequest.getFirstBytePositionOfBlock() > this._filesize) {
                            malformedMessageErr = 'Malformed block request.';
                        } else {
                            if (blockRequest.getFirstBytePositionOfBlock() === this._filesize) {
                                // we are done
                                this.emit('completed');

                                this._kill(false, 'Completed.');
                            } else if (this._manuallyAborted) {
                                this._kill(true, 'Manually aborted.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                            } else {
                                // everything okay so far. read from file.
                                if (!this._fdOpen) {
                                    this._fileReader.prepareToRead(function (err) {
                                        if (err) {
                                            _this._kill(true, err.message, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                                        } else {
                                            _this.emit('startingUpload');
                                            _this._fdOpen = true;
                                            _this._readBlockAndSendByRequest(blockRequest);
                                        }
                                    });
                                } else {
                                    this._readBlockAndSendByRequest(blockRequest);
                                }
                            }
                        }
                    } else {
                        malformedMessageErr = 'Prohibited message type.';
                    }
                }
            }

            if (malformedMessageErr) {
                if (teardownOnError) {
                    this._shareMessenger.teardownLatestCircuit();
                }

                this._kill(false, malformedMessageErr);
            }
        }
    };

    Upload.prototype._readBlockAndSendByRequest = function (blockRequest) {
        var _this = this;
        var firstByteOfBlock = blockRequest.getFirstBytePositionOfBlock();

        this._fileReader.readBlock(firstByteOfBlock, function (err, readBytes) {
            var errorMessage = err ? err.message : null;
            errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

            if (errorMessage) {
                _this._kill(true, errorMessage, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
            } else {
                _this._prepareToImmediateShare(function (err) {
                    if (err) {
                        _this._kill(true, err.message, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                    } else {
                        _this.emit('uploadingBytes', readBytes.length);

                        var nextTransferIdentifier = crypto.pseudoRandomBytes(16).toString('hex');
                        var blockClear = _this._writableBlockFactory.constructMessage(_this._feedingNodesBlockMaintainer.getBlock(), firstByteOfBlock, nextTransferIdentifier, readBytes);

                        _this._encrypter.encryptMessage(_this._outgoingKey, true, blockClear, function (err, encryptedBuffer) {
                            var errorMessage = err ? 'Encryption error.' : null;
                            errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

                            if (errorMessage) {
                                _this._kill(true, errorMessage, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                            } else {
                                var sendableBuffer = _this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', blockRequest.getNextTransferIdentifier(), encryptedBuffer);
                                _this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, blockRequest.getFeedingNodesBlock(), 'ENCRYPTED_SHARE', nextTransferIdentifier, function (err, responsePayload) {
                                    _this._handleMessengerResponse(err, responsePayload);
                                });
                            }
                        });
                    }
                });
            }
        });
    };

    Upload.prototype._sendShareRatify = function () {
        var _this = this;
        this.emit('ratifyingRequest');

        var diffieHellman = crypto.getDiffieHellman('modp14');
        var dhPublic = Padding.pad(diffieHellman.generateKeys(), 256);
        var secret = diffieHellman.computeSecret(this._downloaderDHPayload);
        var sha1 = crypto.createHash('sha1').update(secret).digest();

        // so far, so good, now derive the keys
        var hkdf = new HKDF('sha256', secret);
        var keysConcat = hkdf.derive(48, new Buffer(this._requestTransferIdentifier, 'hex'));

        this._incomingKey = keysConcat.slice(0, 16);
        this._outgoingKey = keysConcat.slice(16, 32);

        var expectedTransferIdentifier = keysConcat.slice(32).toString('hex');

        // we have everything, prepare to send
        this._prepareToImmediateShare(function (err) {
            if (err) {
                _this._kill(false, err.message);
            } else {
                var partToEncrypt = _this._writableShareRatifyFactory.constructPartToEncrypt(_this._feedingNodesBlockMaintainer.getBlock(), _this._filesize, _this._filename);

                _this._encrypter.encryptMessage(_this._outgoingKey, true, partToEncrypt, function (err, encryptedBuffer) {
                    var errorMessage = err ? 'Encryption error.' : null;
                    errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

                    if (errorMessage) {
                        _this._kill(false, errorMessage);
                    } else {
                        var ratifyPayload = _this._writableShareRatifyFactory.constructMessage(dhPublic, sha1, encryptedBuffer);
                        var sendableBuffer = _this._transferMessageCenter.wrapTransferMessage('SHARE_RATIFY', _this._requestTransferIdentifier, ratifyPayload);

                        _this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, _this._initialFeedingNodesBlockOfDownloader, 'ENCRYPTED_SHARE', expectedTransferIdentifier, function (err, responsePayload) {
                            _this._handleMessengerResponse(err, responsePayload);
                        });
                    }
                });
            }
        });
    };
    return Upload;
})(events.EventEmitter);

module.exports = Upload;
//# sourceMappingURL=Upload.js.map
