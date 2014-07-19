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

/**
* DownloadInterface implementation.
*
* @class core.protocol.fileTransfer.share.Download
* @interface core.protocol.fileTransfer.share.DownloadInterface
*
* @param {string} filename The name of the file to request
* @param {number} expectedSize Expected number of bytes of the file to request
* @param {string} expectedHash Hexadecimal string representation of the SHA-1 hash of the file to request
* @param {Buffer} initialFeedingNodesBlockBufferOfUpload The feeding nodes block that came with the result of a query, indicating how the uploader can be reached.
* @param {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} feedingNodesBlockMaintainer Fresh feeding nodes block maintainer instance.
* @param {core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface} fileBlockWriterFactory Factory for creating file block writers.
* @param {core.protocol.fileTransfer.share.ShareMessengerInterface} shareMessenger Fresh share messenger instance.
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter Working transfer message center instance.
* @param {core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface} writableShareRequestFactory
* @param {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} writableEncryptedShareFactory
* @param {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} readableEncryptedShareFactory
* @param {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} readableShareAbortFactory
* @param {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} writableShareAbortFactory
* @param {core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface} readableBlockFactory
* @param {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface} readableShareRatifyFactory
* @param {core.protocol.hydra.ReadableDecryptedMessageFactory} decrypter Factory for decrypting messages (e.g. AES-128-GCM factory)
* @param {core.protocol.hydra.WritableEncryptedMessageFactory} encrypter Factory for encrypting messages (e.g. AES-128-GCM factory)
* @param {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface} writableBlockRequestFactory
*/
var Download = (function (_super) {
    __extends(Download, _super);
    function Download(filename, expectedSize, expectedHash, initialFeedingNodesBlockBufferOfUploader, feedingNodesBlockMaintainer, fileBlockWriterFactory, shareMessenger, transferMessageCenter, writableShareRequestFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockFactory, readableShareRatifyFactory, decrypter, encrypter, writableBlockRequestFactory) {
        _super.call(this);
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_decrypter
        */
        this._decrypter = null;
        /**
        * Stores the Diffie-Hellman key exchange object used for the key negotiation.
        *
        * @member {crypto.DiffieHellman} core.protocol.fileTransfer.share.Download~_diffieHellman
        */
        this._diffieHellman = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_encrypter
        */
        this._encrypter = null;
        /**
        * Stores the expected SHA-1 hash of the file to request.
        *
        * @member {string} core.protocol.fileTransfer.share.Download~_expectedHash
        */
        this._expectedHash = null;
        /**
        * Stores the expected number of bytes of the file to request.
        *
        * @member {number} core.protocol.fileTransfer.share.Download~_expectedSize
        */
        this._expectedSize = 0;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} core.protocol.fileTransfer.share.Download~_feedingNodesBlockMaintainerInterface
        */
        this._feedingNodesBlockMaintainer = null;
        /**
        * Constructed with the factory in constructor, with the filename, expected size and expected hash.
        *
        * @member {core.protocol.fileTransfer.share.FileBlockWriterInterface} core.protocol.fileTransfer.share.Download~_fileBlockWriter
        */
        this._fileBlockWriter = null;
        /**
        * Stores the name of the file to request.
        *
        * @member {string} core.protocol.fileTransfer.share.Download~_filename
        */
        this._filename = null;
        /**
        * Stores the negotiated key for decrypting incoming messages
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Download~_incomingKey
        */
        this._incomingKey = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Download~_initialFeedingNodesBlockBufferOfUploader
        */
        this._initialFeedingNodesBlockBufferOfUploader = null;
        /**
        * Flag indicating whether the download process is still active / can be used, or has been killed.
        * Also used to prevent killing the same download multiple times.
        *
        * @member {boolean} core.protocol.fileTransfer.share.Download~_killed
        */
        this._killed = false;
        /**
        * This flag indicates whether the download has been manually aborted. In many cases, the real aborting process can only
        * be fulfilled when something has happened – a message has rolled in, or an event has triggered, so this is used to
        * check if to abort the process or not at some point.
        *
        * @member {boolean} core.protocol.fileTransfer.share.Download~_manuallyAborted
        */
        this._manuallyAborted = false;
        /**
        * Stores the negotiated key for encrypting outgoing messages
        *
        * @member {Buffer} core.protocol.fileTransfer.share.Download~_outgoingKey
        */
        this._outgoingKey = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableBlockFactory
        */
        this._readableBlockFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableEncryptedShareFactory
        */
        this._readableEncryptedShareFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableShareAbortFactory
        */
        this._readableShareAbortFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableShareRatifyFactory
        */
        this._readableShareRatifyFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.ShareMessengerInterface} core.protocol.fileTransfer.share.Download~_shareMessenger
        */
        this._shareMessenger = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Download~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableBlockRequestFactory
        */
        this._writableBlockRequestFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableEncryptedShareFactory
        */
        this._writableEncryptedShareFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableShareAbortFactory
        */
        this._writableShareAbortFactory = null;
        /**
        * Provided in constructor. See above.
        *
        * @member {core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableShareRequestFactory
        */
        this._writableShareRequestFactory = null;

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
    /**
    * BEGIN TESTING PURPOSES
    */
    Download.prototype.getFeedingNodesBlockMaintainer = function () {
        return this._feedingNodesBlockMaintainer;
    };

    /**
    * END TESTING PURPOSES
    */
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

    /**
    * Handles an incoming file block message returned from the share messenger.
    * The message is decrypted and deformatted. If it is a SHARE_ABORT message, the download is killed without sending
    * a SHARE_ABORT message.
    * If it is a valid BLOCK message, it is checked whether the download process has been manually aborted in the meantime.
    * If yes, the download process is killed and a SHARE_ABORT message is sent. If not, the data block is written to the
    * file writer and waited for a callback. Then it is checked if the file writing process has successfully finished. If yes,
    * manual abortion is prohibited and a last BLOCK_REQUEST message as acknowledgement is written out, before emitting a 'completed'
    * event and cleaning up the download process.
    *
    * If the file writing process is not yet done, it is checked for any file writing errors are manual abortion. If one of them
    * is present, the download process is killed and a last SHARE_ABORT message is sent to the other side.
    * Otherwise the complete amount of written bytes is emitted, before issuing a new BLOCK_REQUEST message.
    *
    * On any problems decrypting or deformatting the message, or when a prohibited message type is used,
    * the download process is killed and the last circuit of the message torn down.
    *
    * @method core.protocol.fileTransfer.share.Download~_handleBlockMessage
    *
    * @param {Buffer} payload The received payload of the ENCRYPTED_SHARE message
    * @param {number} expectedBytePosition The expected first byte position of the next potential data block
    */
    Download.prototype._handleBlockMessage = function (payload, expectedBytePosition) {
        var _this = this;
        var decryptedMessage = this._decrypter.create(payload, this._incomingKey);
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
                    } else if (!(shareAbortMessage.getFileHash() === this._expectedHash && shareAbortMessage.getFilename() === this._filename && shareAbortMessage.getFilesize() === this._expectedSize)) {
                        malformedMessageErr = 'File properties do not match in abort message.';
                    } else {
                        malformedMessageErr = 'Uploader aborted transfer.';
                        teardownOnError = false;
                    }
                } else if (shareMessage.getMessageType() === 'BLOCK') {
                    var blockMessage = this._readableBlockFactory.create(shareMessage.getPayload());

                    if (!blockMessage || blockMessage.getFirstBytePositionOfBlock() !== expectedBytePosition) {
                        malformedMessageErr = 'Malformed block message.';
                    } else {
                        if (this._manuallyAborted) {
                            this._kill(true, true, true, 'Manually aborted.', blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
                        } else {
                            // everything okay so far. pass to the file writer.
                            this._fileBlockWriter.writeBlock(blockMessage.getDataBlock(), function (err, fullCountOfWrittenBytes, isFinished) {
                                if (isFinished) {
                                    // finalize it
                                    _this._sendBlockRequest(fullCountOfWrittenBytes, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock(), true);

                                    _this.emit('completed');
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

            if (teardownOnError) {
                this._shareMessenger.teardownLatestCircuit();
            }
        }
    };

    /**
    * Handles an expected SHARE_RATIFY message, marking the end of the key negotiation process.
    * The message is deformatted, and the diffie hellman public key extracted and the secret calculated, if successful.
    * If the received hash and the calculated hash of the secret match, the symmetric keys and the transfer identifier for the
    * next message are derived. Then the encrypted part of the SHARE_RATIFY message is encrypted and the filename and size
    * compared. If everything matches, at last it is checked whether the download process has been manually aborted.
    * If yes, the download process is killed, but now downloader and uploader share the same symmetric keys, so a SHARE_ABORT
    * message can also be sent.
    * Otherwise the 'startingTransfer' event is emitted before sending an initial BLOCK_REQUEST.
    *
    * On any deformatting, decryption, or compare errors, the download process is killed and the last circuit of the message
    * torn down.
    *
    * @method core.protocol.fileTransfer.share.Download~_handleRatifyMessage
    *
    * @param {Buffer} payload The payload of the received SHARE_RATIFY message
    * @param {Buffer} prevTransferIdent The transfer identifier of the received message, used as salt for the key derivation.
    */
    Download.prototype._handleRatifyMessage = function (payload, prevTransferIdent) {
        var ratifyMessage = this._readableShareRatifyFactory.create(payload);
        var malformedMessageErr = null;

        if (!ratifyMessage) {
            malformedMessageErr = 'Malformed message.';
        } else {
            var secret = this._diffieHellman.computeSecret(ratifyMessage.getDHPayload());
            var sha1 = crypto.createHash('sha1').update(secret).digest('hex');

            if (sha1 !== ratifyMessage.getSecretHash().toString('hex')) {
                malformedMessageErr = 'Hashes of shared secret do not match.';
            } else {
                // derive keys and the identifier
                var hkdf = new HKDF('sha256', secret);
                var keysConcat = hkdf.derive(48, prevTransferIdent);

                this._outgoingKey = keysConcat.slice(0, 16);
                this._incomingKey = keysConcat.slice(16, 32);

                var nextTransferIdentifier = keysConcat.slice(32).toString('hex');

                // decrypt the encrypted part
                var decryptedPart = this._decrypter.create(ratifyMessage.getEncryptedPart(), this._incomingKey);
                ;

                if (!decryptedPart) {
                    malformedMessageErr = 'Decryption error.';
                } else {
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

    /**
    * Kills the specified parts of the download process and sends an optional SHARE_ABORT message to the uploader.
    * Removes all listeners on the status events and at last emits the 'killed' event with the provided reason.
    *
    * @method core.protocol.fileTransfer.share.Download~_kill
    *
    * @param {boolean} abortFileWriter If true, cleans up the file writer and deletes the written file.
    * @param {boolean} abortBlockMaintainer If true, cleans up the feeding nodes block maintainer.
    * @param {boolean} sendLastAbortMessage If true, a last SHARE_ABORT message is sent to the uploader. This can only be done if symmetric keys have been negotiated.
    * @param {string} message The reason for the killing. See {@link core.protocol.fileTransfer.share.DownloadInterface} for detailed information on the different reason types.
    * @param {string} lastMessageIdentifier Optional. The transfer identifier for a last SHARE_ABORT message. This must be specified if `sendLastAbortMessage` is true.
    * @param {Buffer} lastMessageNodesToFeedBlock Optional. The nodes to feed block in its byte buffer representation. This must be specified if `sendLastAbortMessage` is true.
    */
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

    /**
    * This method checks if the client has at least one circuit to write a feeding request through. If yes, the callback is
    * IMMEDIATELY fired (not async!!). If no, a listener is set to wait for at least one circuit, before firing the callback.
    * If it must be waited and in the meantime the download process has been manually aborted, the callback is fired with
    * an error as argument, indicating to kill the download process.
    *
    * @method core.protocol.fileTransfer.share.Download~_prepareToImmediateShare
    *
    * @param {Function} callback
    */
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

    /**
    * Sends a BLOCK_REQUEST to the uploader.
    * Firstly the prepare-to-share method is called. When the callback is fired and the download has been manually aborted, the
    * process is killed and a last SHARE_ABORT message is sent.
    * Otherwise a random transfer identifier is chosen and the block request built up (encrypting, wrapping in an ENCRYPTED_SHARE message
    * with the identifier that the uploade expects). Then it is checked if it is the 'last' message, i.e. if it is the final acknowledgment message.
    * If so, the last acknowledgment message is sent, and the download process is cleaned up.
    *
    * If it is not the last message, and the process has been manually aborted during encryption, the process is killed and a SHARE_ABORT message sent.
    * Otherwise, the BLOCK_REQUEST message is piped to the share messenger and waited for the callback to fire. When it does so and there is
    * an error, the process is killed, else the message is handled.
    *
    * On any encryption problems, the download process is killed and a SHARE_ABORT message sent. If it is the last message though, on
    * encryption problems, the process is only killed without sending an abort message, as we are done anyway.
    *
    * @method core.protocol.fileTransfer.share.Download~_sendBlockRequest
    *
    * @param {number} bytePosition The position of the first byte in the file to request.
    * @param {string} transferIdentToUse The transfer identifier which the uploader expects.
    * @param {Buffer} nodesToFeedBlock The nodes to feed.
    * @param {boolean} isLast Indicates if this is the last acknowledgment message or not (affects error handling and cleanup).
    */
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

    /**
    * Sends the initial SHARE_REQUEST message. Generates the diffie hellman public key, and prepares-to-share.
    * When prepared and in the meantime the process has been manually aborted, the download process is killed.
    * Otherwise the message is wrapped up and piped to the share messenger, waiting for the callback to fire. When it does so,
    * and in the meantime the process has been manually aborted, the process is killed. Else the SHARE_RATIFY message is handled.
    *
    * @method core.protocol.fileTransfer.share.Download~_sendShareRequest
    */
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
    return Download;
})(events.EventEmitter);

module.exports = Download;
//# sourceMappingURL=Download.js.map
