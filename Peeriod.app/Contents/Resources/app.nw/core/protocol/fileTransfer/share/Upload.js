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

/**
* UploadInterface implementation.
*
* @class core.protocol.fileTransfer.share.Upload
* @implements core.protocol.fileTransfer.share.UploadInterface
*
* @param {string} requestTransferIdentifier The transfer identifier of the SHARE_REQUEST message the upload bases upon. This identifier will be used for the SHARE_RATIFY message.
* @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} The SHARE_REQUEST message the upload bases upon.
* @param {string} filename The name of the requested file.
* @param {number} filesize The number of bytes of the requested file.
* @param {string} filehash Hexadecimal string representation of the SHA-1 hash of the requested file.
* @param {core.fs.FileBlockReaderInterface} fileBlockReader Block reader of the requested file.
* @param {core.protocol.fileTransfer.share.ShareMessengerInterface} shareMessenger Fresh share messenger instance.
* @param {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} feedingNodesBlockMaintainer Fresh feeding nodes block maintainer instance.
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter Working transfer message center instance.
* @param {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface} writableShareRatifyFactory
* @param {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} writableEncryptedShareFactory
* @param {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} readableEncryptedShareFactory
* @param {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} readableShareAbortFactory
* @param {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} writableShareAbortFactory
* @param {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface} readableBlockRequestFactory
* @param {core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface} writableBlockFactory
* @param {core.protocol.hydra.ReadableDecryptedMessageFactory} decrypter Factory for decrypting messages (e.g. AES-128-GCM factory)
* @param {core.protocol.hydra.WritableEncryptedMessageFactory} encrypter Factory for encrypting messages (e.g. AES-128-GCM factory)
*/
var Upload = (function (_super) {
    __extends(Upload, _super);
    function Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, feedingNodesBlockMaintainer, transferMessageCenter, writableShareRatifyFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockRequestFactory, writableBlockFactory, decrypter, encrypter) {
        _super.call(this);
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_decrypter
        */
        this._decrypter = null;
        /**
        * Stores the Diffie-Hellman public key of the downloader received with the SHARE_REQUEST message.
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Upload~_downloaderDHPayload
        */
        this._downloaderDHPayload = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_encrypter
        */
        this._encrypter = null;
        /**
        * Indicates whether the file to be read has been open or not. This is to ensure that the file block reader is only
        * cleaned up when necessary.
        *
        * @member {boolean} core.protocol.fileTransfer.share.Upload~_fdOpen
        */
        this._fdOpen = false;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} core.protocol.fileTransfer.share.Upload~_feedingNodesBlockMaintainer
        */
        this._feedingNodesBlockMaintainer = null;
        /**
        * Stores the SHA-1 hash of the requested file.
        *
        * @member {string} core.protocol.fileTransfer.share.Upload~_filehash
        */
        this._filehash = null;
        /**
        * Stores the name of the requested file.
        *
        * @member {string} core.protocol.fileTransfer.share.Upload~_filename
        */
        this._filename = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.fs.FileBlockReaderInterface} core.protocol.fileTransfer.share.Uploader~_fileReader
        */
        this._fileReader = null;
        /**
        * Stores the number of bytes of the requested file.
        *
        * @member {number} core.protocol.fileTransfer.share.Upload~_filesize
        */
        this._filesize = 0;
        /**
        * Stores the negotiated key for decrypting incoming messages
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Upload~_incomingKey
        */
        this._incomingKey = null;
        /**
        * The feeding nodes block provided in the underlying SHARE_REQUEST message.
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Upload~_initialFeedingNodesBlockOfDownloader
        */
        this._initialFeedingNodesBlockOfDownloader = null;
        /**
        * Flag indicating whether the upload process is still active / valid, or has been killed.
        * Also used to prevent killing the same upload multiple times.
        *
        * @member {boolean} core.protocol.fileTransfer.share.Upload~_killed
        */
        this._killed = false;
        /**
        * This flag indicates whether the upload has been manually aborted. In many cases, the real aborting process can only
        * be fulfilled when something has happened – a message has rolled in, or an event has triggered, so this is used to
        * check if to abort the process or not at some point.
        *
        * @member {boolean} core.protocol.fileTransfer.share.Upload~_manuallyAborted
        */
        this._manuallyAborted = false;
        /**
        * Stores the negotiated key for encrypting outgoing messages
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Upload~_outgoingKey
        */
        this._outgoingKey = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableBlockRequestFactory
        */
        this._readableBlockRequestFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableEncryptedShareFactory
        */
        this._readableEncryptedShareFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableShareAbortFactory
        */
        this._readableShareAbortFactory = null;
        /**
        * Stores the transfer identifier of the upload's underlying SHARE_REQUEST message. Used for SHARE_RATIFY message.
        *
        * @member {string} core.protocol.fileTransfer.share.Upload~_requestTransferIdentifier
        */
        this._requestTransferIdentifier = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ShareMessengerInterface} core.protocol.fileTransfer.share.Upload~_shareMessenger
        */
        this._shareMessenger = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Upload~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableBlockFactory
        */
        this._writableBlockFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableEncryptedShareFactory
        */
        this._writableEncryptedShareFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableShareAbortFactory
        */
        this._writableShareAbortFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableShareRatifyFactory
        */
        this._writableShareRatifyFactory = null;

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

    /**
    * Handles a response callback from the share messenger.
    * If the messenger timed out (thus there is no response), the upload process is killed.
    * If there is a message, it is decrpyted and deformatted. If it's a SHARE_ABORT message, the upload is killed and cleaned up.
    * If it is a BLOCK_REQUEST, it is checked whether the requested first byte of the block marks the end of the file. If so,
    * the whole download/upload process is complete and the upload can be cleaned up. The 'complete' event is emitted.
    * Otherwise the appropriate byte block is read from the file and sent within a BLOCK message.
    *
    * If the upload process is not yet done, it is checked for manual abortion. If the process has been aborted,
    * the upload is killed and a last SHARE_ABORT message is sent to the downloader.
    *
    * On any problems decrypting or deformatting the message, or if a prohibited message type is used, the upload
    * process is killed and the last circuit of the message torn down.
    *
    * @method core.protocol.fileTransfer.share.Upload~_handleMessengerResponse
    *
    * @param {Error} err Optional error received from the share messenger's response callback.
    * @param {Buffer} responsePayload Optional message payload received from the sahre messenger's response callback.
    */
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
                                //console.log('Received block request. Byte pos: ' + blockRequest.getFirstBytePositionOfBlock());
                                // everything okay so far. read from file.
                                if (!this._fdOpen) {
                                    this._fileReader.prepareToRead(function (err) {
                                        if (err) {
                                            _this._kill(true, 'File cannot be read.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
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

    /**
    * Cleans up the upload process (e.g. file reader, setting flags, feeding nodes block maintainer) and sends an optional
    * SHARE_ABORT message to the downloader.
    * Removes all listeners on the status events and at last emits the 'killed' event with the provided reason.
    *
    * This is mostly a copy from {@link core.protocol.fileTransfer.share
    *
    * @method core.protocol.fileTransfer.share.Uploader~_kill
    *
    * @param {boolean} sendLastAbortMessage If true, a last SHARE_ABORT message is sent to the downloader.
    * @param {string} message The reason for the killing. See {@link core.protocol.fileTransfer.share.UploadInterface} for detailed information on the different reason types.
    * @param {string} lastMessageIdentifier Optional. The transfer identifier for a last SHARE_ABORT message. This must be specified if `sendLastAbortMessage` is true.
    * @param {Buffer} lastMessageNodesToFeedBlock Optional. The nodes to feed block in its byte buffer representation. This must be specified if `sendLastAbortMessage` is true.
    */
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
            this.removeAllListeners('uploadingBytes');
            this.removeAllListeners('completed');
            this.removeAllListeners('startingUpload');

            //console.log('Upload killed due to: ' + message);
            this.emit('killed', message);

            this.removeAllListeners('killed');
        }
    };

    /**
    * This method checks if the client has at least one circuit to write a feeding request through. If yes, the callback is
    * IMMEDIATELY fired (not async!!). If not, a listener is set to wait for at least one circuit, before firing the callback.
    * If it must be waited and in the meantime the upload process has been manually aborted, the callback is fired with
    * an error as argument, indicating to kill the upload process.
    *
    * Note: This method is an exact copy from {@link core.protocol.fileTransfer.share.Download}
    *
    * @method core.protocol.fileTransfer.share.Upload~_prepareToImmediateShare
    *
    * @param {Function} callback
    */
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

    /**
    * Reads a byte block from the file from the requested position, wraps it within a BLOCK message, encrypts it
    * and pipes it to the share messenger, waiting for an acknowledging BLOCK_REQUEST message.
    *
    * If anything goes wrong, or the upload process has been manually aborted while waiting for encryption / hydra circuits,
    * the upload process is killed and a last SHARE_ABORT message is sent to the downloader.
    *
    * @method core.protocol.fileTransfer.share.Uploader~_readBlockAndSendByRequest
    *
    * @param {core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface} blockRequest The BLOCK_REQUEST message to handle.
    */
    Upload.prototype._readBlockAndSendByRequest = function (blockRequest) {
        var _this = this;
        var firstByteOfBlock = blockRequest.getFirstBytePositionOfBlock();

        this._fileReader.readBlock(firstByteOfBlock, function (err, readBytes) {
            var errorMessage = err ? err.message : null;
            errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

            if (errorMessage) {
                _this._kill(true, 'Block cannot be read.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
            } else {
                _this._prepareToImmediateShare(function (err) {
                    if (err) {
                        _this._kill(true, err.message, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                    } else {
                        _this.emit('uploadingBytes', readBytes.length);

                        var nextTransferIdentifier = crypto.pseudoRandomBytes(16).toString('hex');
                        var blockClear = _this._writableEncryptedShareFactory.constructMessage('BLOCK', _this._writableBlockFactory.constructMessage(_this._feedingNodesBlockMaintainer.getBlock(), firstByteOfBlock, nextTransferIdentifier, readBytes));

                        _this._encrypter.encryptMessage(_this._outgoingKey, true, blockClear, function (err, encryptedBuffer) {
                            var errorMessage = err ? 'Encryption error.' : null;
                            errorMessage = _this._manuallyAborted ? 'Manually aborted.' : errorMessage;

                            if (errorMessage) {
                                _this._kill(true, errorMessage, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
                            } else {
                                //console.log('Sending block.');
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

    /**
    * The first action of an upload: Sending a SHARE_RATIFY message.
    * The Diffie-Hellman secret is generated, the keys derived and the uploader's public key wrapped within a SHARE_RATIFY message,
    * already encrypting filename and filesize as an additional small authenticity check.
    *
    * As always, if anything goes wrong: Kill the upload process.
    *
    * @method core.protocol.fileTransfer.share.Upload~_sendShareRatify
    */
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
