/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');
var crypto = require('crypto');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HKDF = require('../../../../src/core/crypto/HKDF');
var Padding = require('../../../../src/core/crypto/Padding');
var Download = require('../../../../src/core/protocol/fileTransfer/share/Download');
var ShareMessenger = require('../../../../src/core/protocol/fileTransfer/share/ShareMessenger');

var TransferMessageCenter = require('../../../../src/core/protocol/fileTransfer/TransferMessageCenter');
var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');
var FileBlockWriter = require('../../../../src/core/protocol/fileTransfer/share/FileBlockWriter');
var FileBlockWriterFactory = require('../../../../src/core/protocol/fileTransfer/share/FileBlockWriterFactory');

// Factories
var WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
var ReadableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/ReadableFileTransferMessageFactory');
var WritableShareRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableShareRequestMessageFactory');
var WritableEncryptedShareMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableEncryptedShareMessageFactory');
var ReadableEncryptedShareMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableEncryptedShareMessageFactory');
var ReadableShareAbortMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareAbortMessageFactory');
var WritableShareAbortMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableShareAbortMessageFactory');
var ReadableBlockMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableBlockMessageFactory');
var ReadableShareRatifyMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRatifyMessageFactory');
var Aes128GcmReadableDecryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessageFactory');
var Aes128GcmWritableMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');
var WritableBlockRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableBlockRequestMessageFactory');
var ReadableShareRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRequestMessageFactory');
var WritableShareRatifyMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableShareRatifyMessageFactory');
var WritableBlockMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableBlockMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Download (semi-integration) @current', function () {
    var sandbox = null;
    var filename = 'A filename';
    var expectedSize = 1000;
    var expectedHash = 'ade86b48fbf3f5f3b137b7501e6a23c69288ff8e';

    // file block writer checkers
    var prepareToWriteError = false;

    var hasNodeBatch = false;
    var nodeBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: '34196e10e13eb40bd8b6309a2da52a0c' }]);
    var initialBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '2.2.2.2', port: 80, feedingIdentifier: '34196e10e13eb40bd8b6309a2da52a0d' }]);

    var middleware = new events.EventEmitter();

    // factories
    var writableTransferFactory = new WritableFileTransferMessageFactory();
    var readableTransferFactory = new ReadableFileTransferMessageFactory();
    var readableShareRequestFactory = new ReadableShareRequestMessageFactory();
    var writableShareRatifyFactory = new WritableShareRatifyMessageFactory();
    var remoteEncrypter = new Aes128GcmWritableMessageFactory();
    var remoteDecrypter = new Aes128GcmReadableDecryptedMessageFactory();
    var writableBlockFactory = new WritableBlockMessageFactory();

    var writableShareRequestFactory = null;
    var writableEncryptedShareFactory = null;
    var readableEncryptedShareFactory = null;
    var readableShareAbortFactory = null;
    var writableShareAbortFactory = null;
    var readableBlockFactory = null;
    var readableShareRatifyFactory = null;
    var decrypter = null;
    var encrypter = null;
    var writableBlockRequestFactory = null;

    var prepareFactories = function () {
        writableShareRequestFactory = new WritableShareRequestMessageFactory();
        writableEncryptedShareFactory = new WritableEncryptedShareMessageFactory();
        readableEncryptedShareFactory = new ReadableEncryptedShareMessageFactory();
        readableShareAbortFactory = new ReadableShareAbortMessageFactory();
        writableShareAbortFactory = new WritableShareAbortMessageFactory();
        readableBlockFactory = new ReadableBlockMessageFactory();
        readableShareRatifyFactory = new ReadableShareRatifyMessageFactory();
        decrypter = new Aes128GcmReadableDecryptedMessageFactory();
        encrypter = new Aes128GcmWritableMessageFactory();
        writableBlockRequestFactory = new WritableBlockRequestMessageFactory();
    };

    var remoteIncomingKey = null;
    var remoteOutgoingKey = null;
    var nextIdent = null;

    var createBlockMessage = function (messWithEncryption, messWithIndicatorByte, messWithDecryptedBlockMessage, cb) {
        nextIdent = crypto.pseudoRandomBytes(16).toString('hex');
        var blockMsgClear = writableBlockFactory.constructMessage(initialBlock, 0, nextIdent, new Buffer(1));

        if (messWithDecryptedBlockMessage) {
            blockMsgClear[17] = 0xff;
        }

        var shareMsg = writableEncryptedShareFactory.constructMessage('BLOCK', blockMsgClear);

        if (messWithIndicatorByte) {
            shareMsg[0] = 0xff;
        }

        remoteEncrypter.encryptMessage(remoteOutgoingKey, true, shareMsg, function (err, encryptedPart) {
            if (messWithEncryption) {
                encryptedPart[12] = encryptedPart[12] + 10;
            }

            cb(encryptedPart);
        });
    };

    var createAbortMessage = function (messWithMessageFormat, messWithFileStats, cb) {
        var abortMsgClear = writableShareAbortFactory.constructMessage(messWithFileStats ? 10 : expectedSize, filename, expectedHash);

        if (messWithMessageFormat) {
            abortMsgClear = new Buffer(1);
        }

        var shareMsg = writableEncryptedShareFactory.constructMessage('SHARE_ABORT', abortMsgClear);

        remoteEncrypter.encryptMessage(remoteOutgoingKey, true, shareMsg, function (err, encryptedPart) {
            cb(encryptedPart);
        });
    };

    var createRatifyMessageFromRequest = function (payload, expectedIdentifier, messWithHash, messWithStats, messWithEncryption, messWithDecryptedPart, cb) {
        // deformat the message
        var readableMsg = readableShareRequestFactory.create(readableTransferFactory.create(payload).getPayload());
        var dhPayload = readableMsg.getDHPayload();
        var diffie = crypto.getDiffieHellman('modp14');
        var dhPublic = Padding.pad(diffie.generateKeys(), 256);
        var secret = diffie.computeSecret(dhPayload);
        var hash = crypto.createHash('sha1').update(secret).digest();

        var hkdf = new HKDF('sha256', secret);
        var keysConcat = hkdf.derive(48, new Buffer(expectedIdentifier, 'hex'));
        var incomingKey = keysConcat.slice(0, 16);
        remoteIncomingKey = incomingKey;
        var outgoingKey = keysConcat.slice(16, 32);
        remoteOutgoingKey = outgoingKey;
        var nextTransferIdent = keysConcat.slice(32).toString('hex');

        if (messWithHash) {
            hash[0]++;
        }

        var partToEncrypt = writableShareRatifyFactory.constructPartToEncrypt(initialBlock, expectedSize, messWithStats ? 'Foobar' : filename);

        if (messWithDecryptedPart) {
            partToEncrypt = partToEncrypt.slice(0, Math.ceil(partToEncrypt.length / 2));
        }

        remoteEncrypter.encryptMessage(outgoingKey, true, partToEncrypt, function (err, encryptedPart) {
            if (messWithEncryption) {
                encryptedPart[12] = encryptedPart[12] + 10;
            }

            cb(writableShareRatifyFactory.constructMessage(dhPublic, hash, encryptedPart), incomingKey, outgoingKey, nextTransferIdent);
        });
    };

    var createDownload = function () {
        var shareMessenger = testUtils.stubPublicApi(sandbox, ShareMessenger, {
            pipeLastMessage: function (payload, nodesToFeedBlock) {
                middleware.emit('pipingLast', payload, nodesToFeedBlock);
            },
            pipeMessageAndWaitForResponse: function (payload, nodesToFeedBlock, expectedType, expectedIdentifier, callback) {
                middleware.once('res', function (responsePayload) {
                    if (responsePayload) {
                        callback(null, responsePayload);
                    } else {
                        callback(new Error('Piper'), null);
                    }
                });
                middleware.emit('piping', payload, nodesToFeedBlock, expectedType, expectedIdentifier);
            }
        });

        var feedingNodesBlockMaintainer = new events.EventEmitter();
        feedingNodesBlockMaintainer.getCurrentNodeBatch = function () {
            if (hasNodeBatch) {
                return [1];
            } else {
                return [];
            }
        };
        feedingNodesBlockMaintainer.getBlock = function () {
            return nodeBlock;
        };
        feedingNodesBlockMaintainer.cleanup = function () {
            middleware.emit('blockMaintainerCleanup');
        };

        var transferMessageCenter = testUtils.stubPublicApi(sandbox, TransferMessageCenter, {
            wrapTransferMessage: function (type, id, payload) {
                return writableTransferFactory.constructMessage(id, type, payload);
            }
        });

        var fileBlockWriterFactory = testUtils.stubPublicApi(sandbox, FileBlockWriterFactory, {
            createWriter: function () {
                return testUtils.stubPublicApi(sandbox, FileBlockWriter, {
                    prepareToWrite: function (callback) {
                        if (prepareToWriteError) {
                            callback(new Error());
                        } else {
                            callback(null);
                        }
                    },
                    abort: function () {
                        middleware.emit('writerAborted');
                    },
                    writeBlock: function (dataBlock, callback) {
                        middleware.once('writerRes', function (err, fullCountOfBytes, isFinished) {
                            callback(err, fullCountOfBytes, isFinished);
                        });

                        middleware.emit('writerData', dataBlock);
                    }
                });
            }
        });

        return new Download(filename, expectedSize, expectedHash, initialBlock, feedingNodesBlockMaintainer, fileBlockWriterFactory, shareMessenger, transferMessageCenter, writableShareRequestFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockFactory, readableShareRatifyFactory, decrypter, encrypter, writableBlockRequestFactory);
    };

    it('should correctly create a download', function () {
        var download = createDownload();
        download.should.be.instanceof(Download);
    });

    it('should kick off a download and kill it when the writer cannot be prepared', function (done) {
        var download = createDownload();
        prepareToWriteError = true;

        middleware.once('blockMaintainerCleanup', function () {
            download.once('killed', function (message) {
                message.should.equal('File cannot be written.');
                done();
            });
        });

        download.kickOff();
    });

    it('should kick off a download kill it when manually aborted while preparing to write', function (done) {
        var download = createDownload();
        prepareToWriteError = false;
        download.manuallyAbort();

        middleware.once('writerAborted', function () {
            middleware.once('blockMaintainerCleanup', function () {
                download.once('killed', function (message) {
                    message.should.equal('Manually aborted.');
                    done();
                });
            });
        });

        download.kickOff();
    });

    it('should try to send a share request but kill it when manually aborting during waiting for batch', function (done) {
        hasNodeBatch = false;

        var download = createDownload();

        download.once('requestingFile', function () {
            download.once('killed', function (message) {
                message.should.equal('Manually aborted.');
                download.getFeedingNodesBlockMaintainer().listeners('nodeBatchLength').length.should.equal(0);
                done();
            });

            setImmediate(function () {
                download.manuallyAbort();
            });
        });

        download.kickOff();
    });

    it('should kill the download when sending a SHARE_REQUEST message but retrieving no response', function (done) {
        hasNodeBatch = true;

        prepareFactories();

        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            expectedType.should.equal('SHARE_RATIFY');
            nodesToFeedBlock.toString('hex').should.equal(initialBlock.toString('hex'));

            download.once('killed', function (message) {
                message.should.equal('Piper');
                done();
            });

            middleware.emit('res', null);
        });

        download.kickOff();
    });

    it('should kill the download when handling a malformed SHARE_RATIFY message', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            expectedType.should.equal('SHARE_RATIFY');

            download.once('killed', function (message) {
                message.should.equal('Malformed message.');
                done();
            });

            middleware.emit('res', new Buffer(2));
        });

        download.kickOff();
    });

    it('should kill the download when handling a SHARE_RATIFY message and the hashes of the shared secret do not match', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, true, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Hashes of shared secret do not match.');
            done();
        });

        download.kickOff();
    });

    it('should kill the download when handling a SHARE_RATIFY message and the encrypted part cannot be properly decrypted', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, true, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Decryption error.');
            done();
        });

        download.kickOff();
    });

    it('should kill the download when handling a SHARE_RATIFY message and the decrypted part is malformed', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, true, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Malformed decrypted message.');
            done();
        });

        download.kickOff();
    });

    it('should kill the download when handling a SHARE_RATIFY message and the file stats do not match', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, false, true, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Filename and size do not match requested file.');
            done();
        });

        download.kickOff();
    });

    it('should kill the download and send a SHARE_ABORT message if the download process is manually aborted while waiting for an answer', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            download.manuallyAbort();

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.once('pipingLast', function (payload, nodesToFeedBlock) {
                    var readableMsg = readableTransferFactory.create(payload);
                    readableMsg.getTransferId().should.equal(expectedIdent);

                    var decMsg = remoteDecrypter.create(readableMsg.getPayload(), incomingKey);

                    var abortMsg = readableShareAbortFactory.create(readableEncryptedShareFactory.create(decMsg.getPayload()).getPayload());

                    abortMsg.getFilename().should.equal(filename);
                    abortMsg.getFilesize().should.equal(expectedSize);
                    abortMsg.getFileHash().should.equal(expectedHash);
                    middleware.emit('pipedIt');
                });

                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            middleware.once('pipedIt', function () {
                message.should.equal('Manually aborted.');
                done();
            });
        });

        download.kickOff();
    });

    it('should correctly handle a SHARE_RATIFY message and try to send a block request, but kill the download when aborting while waiting for circuit', function (done) {
        var download = createDownload();
        var cameThrough = false;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('startingTransfer', function () {
            cameThrough = true;
            hasNodeBatch = false;

            setImmediate(function () {
                download.manuallyAbort();
                download.getFeedingNodesBlockMaintainer().emit('nodeBatchLength');
            });
        });

        download.once('killed', function (message) {
            cameThrough.should.be.true;
            message.should.equal('Manually aborted.');
            done();
        });
        download.kickOff();
    });

    it('should format a BLOCK_REQUEST but kill the process when manually aborting during encryption', function (done) {
        var download = createDownload();
        var cameThrough = false;
        hasNodeBatch = true;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('startingTransfer', function () {
            cameThrough = true;
            hasNodeBatch = false;

            setImmediate(function () {
                download.getFeedingNodesBlockMaintainer().emit('nodeBatchLength');
                download.manuallyAbort();
            });
        });

        download.once('killed', function (message) {
            cameThrough.should.be.true;
            message.should.equal('Manually aborted.');
            done();
        });

        download.kickOff();
    });

    it('should send a BLOCK_REQUEST and kill the process when manually aborting while waiting for response', function (done) {
        var download = createDownload();
        hasNodeBatch = true;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                expectedType.should.equal('ENCRYPTED_SHARE');

                middleware.emit('res', null);
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Piper');
            done();
        });

        download.kickOff();
    });

    it('should send a BLOCK_REQUEST and kill the process when no response comes back', function (done) {
        var download = createDownload();
        hasNodeBatch = true;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                expectedType.should.equal('ENCRYPTED_SHARE');

                middleware.emit('res', null);
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Piper');
            done();
        });

        download.kickOff();
    });

    it('should receive a BLOCK and kill the process on decryption error', function (done) {
        var download = createDownload();

        var checker = false;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createBlockMessage(true, false, false, function (payload) {
                    checker = true;
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Decryption error.');
            checker.should.be.true;
            done();
        });

        download.kickOff();
    });

    it('should receive a BLOCK and kill the process on a malformed share message', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createBlockMessage(false, true, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Malformed share message.');
            done();
        });

        download.kickOff();
    });

    it('should receive a SHARE_ABORT message and kill the process on a malformed abort message', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createAbortMessage(true, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Malformed abort message.');
            done();
        });

        download.kickOff();
    });

    it('should receive a SHARE_ABORT message and kill the process if the file properties do not match', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createAbortMessage(false, true, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('File properties do not match in abort message.');
            done();
        });

        download.kickOff();
    });

    it('should receive a perfectly fine SHARE_ABORT message kill the process', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createAbortMessage(false, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Uploader aborted transfer.');
            done();
        });

        download.kickOff();
    });

    it('should receive a BLOCK and kill the process on a malformed block message', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                createBlockMessage(false, false, true, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            message.should.equal('Malformed block message.');
            done();
        });

        download.kickOff();
    });

    it('should receive a BLOCK and send a SHARE_ABORT message when the process was manually aborted while waiting for response', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                middleware.once('pipingLast', function (payload, nodesToFeedBlock) {
                    var readableMsg = readableTransferFactory.create(payload);
                    readableMsg.getTransferId().should.equal(nextIdent);

                    var decMsg = remoteDecrypter.create(readableMsg.getPayload(), remoteIncomingKey);

                    var abortMsg = readableShareAbortFactory.create(readableEncryptedShareFactory.create(decMsg.getPayload()).getPayload());

                    abortMsg.getFilename().should.equal(filename);
                    abortMsg.getFilesize().should.equal(expectedSize);
                    abortMsg.getFileHash().should.equal(expectedHash);
                    middleware.emit('pipedIt');
                });

                download.manuallyAbort();

                createBlockMessage(false, false, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            middleware.once('pipedIt', function () {
                message.should.equal('Manually aborted.');
                done();
            });
        });

        download.kickOff();
    });

    it('should handle a BLOCK message and complete the download process if the file is finished', function (done) {
        var download = createDownload();
        var checker = false;

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                middleware.once('writerData', function () {
                    middleware.once('pipingLast', function () {
                        checker = true;
                    });

                    middleware.emit('writerRes', null, 1000, true);
                });

                createBlockMessage(false, false, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            checker.should.be.true;
            message.should.equal('Completed.');
            done();
        });

        download.kickOff();
    });

    it('should handle a BLOCK message and kill the download process and send a SHARE_ABORT message if the writer returns an error', function (done) {
        var download = createDownload();

        download.on('killed', function () {
        });
        download.on('writtenBytes', function () {
        });

        download.listeners('killed').length.should.not.equal(0);
        download.listeners('writtenBytes').length.should.not.equal(0);

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                middleware.once('writerData', function () {
                    middleware.once('pipingLast', function () {
                        middleware.emit('piped');
                    });

                    middleware.emit('writerRes', new Error('Writer error.'), 10, false);
                });

                createBlockMessage(false, false, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.once('killed', function (message) {
            middleware.once('piped', function () {
                message.should.equal('Writer error.');
                done();
            });

            setImmediate(function () {
                download.listeners('killed').length.should.equal(0);
                download.listeners('writtenBytes').length.should.equal(0);
            });
        });

        download.kickOff();
    });

    it('should correctly handle a BLOCK and send a new BLOCK_REQUEST as soon as the data is written to the file', function (done) {
        var download = createDownload();

        middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
            middleware.once('piping', function (payload, nodesToFeedBlock, expectedType, expectedIdentifier) {
                middleware.once('writerData', function () {
                    download.once('writtenBytes', function () {
                        middleware.once('piping', function () {
                            done();
                        });
                    });

                    middleware.emit('writerRes', null, 10, false);
                });

                createBlockMessage(false, false, false, function (payload) {
                    middleware.emit('res', payload);
                });
            });

            createRatifyMessageFromRequest(payload, expectedIdentifier, false, false, false, false, function (payload, incomingKey, outgoingKey, expectedIdent) {
                middleware.emit('res', payload);
            });
        });

        download.kickOff();
    });

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=Download.js.map
