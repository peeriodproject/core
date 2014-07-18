/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var Download = require('../../../../src/core/protocol/fileTransfer/share/Download');
var ShareMessenger = require('../../../../src/core/protocol/fileTransfer/share/ShareMessenger');

var TransferMessageCenter = require('../../../../src/core/protocol/fileTransfer/TransferMessageCenter');
var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');
var FileBlockWriter = require('../../../../src/core/protocol/fileTransfer/share/FileBlockWriter');
var FileBlockWriterFactory = require('../../../../src/core/protocol/fileTransfer/share/FileBlockWriterFactory');

// Factories
var WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
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

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=Download.js.map
