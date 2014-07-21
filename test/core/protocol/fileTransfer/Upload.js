/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var fs = require('fs');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var Aes128GcmDownloadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmDownloadFactory');
var Aes128GcmUploadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmUploadFactory');
var TransferMessageCenter = require('../../../../src/core/protocol/fileTransfer/TransferMessageCenter');
var WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
var ReadableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/ReadableFileTransferMessageFactory');
var ReadableShareRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRequestMessageFactory');

var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');
var FeedingNodesBlockMaintainerFactory = require('../../../../src/core/protocol/fileTransfer/share/FeedingNodesBlockMaintainerFactory');

var ShareMessengerFactory = require('../../../../src/core/protocol/fileTransfer/share/ShareMessengerFactory');
var ShareMessenger = require('../../../../src/core/protocol/fileTransfer/share/ShareMessenger');
var FileBlockWriterFactory = require('../../../../src/core/fs/FileBlockWriterFactory');
var FileBlockReaderFactory = require('../../../../src/core/fs/FileBlockReaderFactory');
var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Upload (integration with Download) @current', function () {
    var sandbox = null;
    var writableFileTransferMessageFactory = new WritableFileTransferMessageFactory();
    var readableFileTransferMessageFactory = new ReadableFileTransferMessageFactory();
    var readableShareRequestMessageFactory = new ReadableShareRequestMessageFactory();
    var feedingNodesBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

    var filepath = testUtils.getFixturePath('core/fileTransfer/snowden_brighton.jpg');
    var downloadFolder = testUtils.getFixturePath('core/fileTransfer/download');
    var filename = 'snowden_brighton.jpg';
    var sha1Hash = '4dad5e4374038a14465f0c42fc150a36674b4bd8';
    var filesize = 517880;

    var downloaderMiddleware = new events.EventEmitter();
    var uploaderMiddleware = new events.EventEmitter();
    var downloadFactory = null;
    var uploadFactory = null;
    var theDownload = null;
    var theUpload = null;

    var transferMessageCenterStub = null;
    var configStub = null;
    var downloaderCircuitLength = 1;
    var uploaderCircuitLength = 1;
    var messWithFilePath = false;

    var createFeedingNodesBlockMaintainerFactory = function (forWhat) {
        var middleware = forWhat === 'download' ? downloaderMiddleware : uploaderMiddleware;

        return testUtils.stubPublicApi(sandbox, FeedingNodesBlockMaintainerFactory, {
            create: function () {
                var maintainer = new events.EventEmitter();
                maintainer.getCurrentNodeBatch = function () {
                    var ret = [];
                    var len = forWhat === 'download' ? downloaderCircuitLength : uploaderCircuitLength;

                    for (var i = 0; i < len; i++) {
                        ret.push('1');
                    }
                    return ret;
                };
                maintainer.getBlock = function () {
                    return feedingNodesBlock;
                };
                maintainer.cleanup = function () {
                };

                middleware.on('circuitLength', function (l) {
                    if (forWhat === 'download') {
                        downloaderCircuitLength = l;
                    } else {
                        uploaderCircuitLength = l;
                    }

                    maintainer.emit('nodeBatchLength');
                });

                return maintainer;
            }
        });
    };

    var createShareMessengerFactory = function (forWhat) {
        var myMiddleware = forWhat === 'download' ? downloaderMiddleware : uploaderMiddleware;
        var remoteMiddleware = forWhat === 'download' ? uploaderMiddleware : downloaderMiddleware;

        return testUtils.stubPublicApi(sandbox, ShareMessengerFactory, {
            createMessenger: function () {
                return testUtils.stubPublicApi(sandbox, ShareMessenger, {
                    pipeLastMessage: function (payloadToFeed) {
                        var msg = readableFileTransferMessageFactory.create(payloadToFeed);

                        myMiddleware.once('canSend', function (success) {
                            var payload = null;
                            if (success) {
                                payload = msg.getPayload();

                                setImmediate(function () {
                                    remoteMiddleware.emit('message', msg.getMessageType() + '_' + msg.getTransferId(), payload);
                                });
                            }
                        });
                        myMiddleware.emit('sending', msg.getMessageType(), msg.getTransferId(), msg.getPayload());
                    },
                    pipeMessageAndWaitForResponse: function (payloadToFeed, nodesToFeed, expectedMessageType, expectedIdent, cb) {
                        var msg = readableFileTransferMessageFactory.create(payloadToFeed);

                        myMiddleware.once('canSend', function (success) {
                            var payload = null;
                            if (success) {
                                payload = msg.getPayload();
                                setImmediate(function () {
                                    remoteMiddleware.emit('message', msg.getMessageType() + '_' + msg.getTransferId(), payload);
                                });
                            } else {
                                cb(new Error('Timed out.'), null);
                            }
                        });

                        myMiddleware.once('message', function (concat, p) {
                            if (concat === (expectedMessageType + '_' + expectedIdent)) {
                                if (p) {
                                    cb(null, p);
                                }
                            }
                        });

                        myMiddleware.emit('sending', msg.getMessageType(), msg.getTransferId(), msg.getPayload());
                    }
                });
            }
        });
    };

    var buildFreshDownloadAndUpload = function (cb) {
        removeFile();

        downloaderMiddleware.removeAllListeners('circuitLength');
        downloaderMiddleware.removeAllListeners('sending');
        downloaderMiddleware.removeAllListeners('canSend');
        downloaderMiddleware.removeAllListeners('message');
        uploaderMiddleware.removeAllListeners('circuitLength');
        uploaderMiddleware.removeAllListeners('sending');
        uploaderMiddleware.removeAllListeners('canSend');
        uploaderMiddleware.removeAllListeners('message');

        theDownload = downloadFactory.create(filename, filesize, sha1Hash, [{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

        downloaderMiddleware.once('sending', function (type, ident) {
            downloaderMiddleware.emit('canSend', true);
            uploaderMiddleware.once('message', function (concat, payload) {
                if (concat === type + '_' + ident) {
                    var msg = readableShareRequestMessageFactory.create(payload);

                    theUpload = uploadFactory.create('foobar', ident, msg, filepath + (messWithFilePath ? 'foo' : ''), filename, filesize, sha1Hash);
                    cb();
                }
            });
        });

        theDownload.kickOff();
    };

    var removeFile = function () {
        try  {
            fs.unlinkSync(downloadFolder + '/snowden_brighton.jpg');
        } catch (e) {
        }
    };

    it('should correctly build up the factories', function () {
        downloadFactory = new Aes128GcmDownloadFactory(createFeedingNodesBlockMaintainerFactory('download'), createShareMessengerFactory('download'), new FileBlockWriterFactory(downloadFolder), transferMessageCenterStub);
        uploadFactory = new Aes128GcmUploadFactory(configStub, createFeedingNodesBlockMaintainerFactory('upload'), createShareMessengerFactory('upload'), new FileBlockReaderFactory(), transferMessageCenterStub);

        downloadFactory.should.be.instanceof(Aes128GcmDownloadFactory);
        uploadFactory.should.be.instanceof(Aes128GcmUploadFactory);
    });

    it('should build up the download and create the upload', function (done) {
        buildFreshDownloadAndUpload(done);
    });

    it('should completely upload and download the file', function (done) {
        var downloadComplete = false;
        var uploadComplete = false;
        var check = function () {
            if (downloadComplete && uploadComplete) {
                done();
            }
        };

        theUpload.once('killed', function (reason) {
            if (reason === 'Completed.') {
                uploadComplete = true;
                check();
            } else
                throw new Error('Bad reason.');
        });

        theDownload.once('killed', function (reason) {
            if (reason === 'Completed.') {
                downloadComplete = true;
                check();
            } else
                throw new Error('Bad reason.');
        });

        uploaderMiddleware.on('sending', function () {
            uploaderMiddleware.emit('canSend', true);
        });

        downloaderMiddleware.on('sending', function () {
            downloaderMiddleware.emit('canSend', true);
        });

        theUpload.kickOff();
    });

    it('should kill the upload when sending a ratify message but aborting manually when waiting for circuits', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 0;

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Manually aborted.');
                done();
            });

            setImmediate(function () {
                theUpload.manuallyAbort();
            });
        });
    });

    it('should kill the upload when aborting during the encryption of the SHARE_RATIFY encrypted part', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 0;

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Manually aborted.');
                done();
            });

            setImmediate(function () {
                uploaderMiddleware.emit('circuitLength', 1);
                theUpload.manuallyAbort();
            });
        });
    });

    it('should kill the upload when sending a message and the response times out', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                uploaderMiddleware.emit('canSend', null);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Timed out.');
                done();
            });
        });
    });

    it('should kill the upload when receiving a message which cannot be properly decrypted', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    payload[12] += 10;

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Decryption error.');
                done();
            });
        });
    });

    it('should kill the upload when receiving a malformed decrypted message', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    payload[13] += 10;

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Malformed share message.');
                done();
            });
        });
    });

    it('should kill the upload when receiving a malformed decrypted message', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    payload[13] += 10;

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Malformed share message.');
                done();
            });
        });
    });

    it('should kill the upload when receiving a SHARE_ABORT message with unmatching file properties', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    payload[14] += 10;

                    downloaderMiddleware.emit('canSend', true);
                });

                theDownload.manuallyAbort();
                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('File properties do not match in abort message.');
                done();
            });
        });
    });

    it('should gracefully kill the upload when receiving a valid SHARE_ABORT message', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    downloaderMiddleware.emit('canSend', true);
                });

                theDownload.manuallyAbort();
                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Downloader aborted transfer.');
                done();
            });
        });
    });

    it('should kill the upload and send a SHARE_ABORT message if the uplaod was manually aborted while waiting for a response', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderCircuitLength = 1;

            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    uploaderMiddleware.once('sending', function () {
                        uploaderMiddleware.emit('canSend', true);
                    });

                    downloaderMiddleware.emit('canSend', true);
                });

                theUpload.manuallyAbort();
                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Manually aborted.');

                theDownload.once('killed', function (reason) {
                    reason.should.equal('Uploader aborted transfer.');
                    done();
                });
            });
        });
    });

    it('should kill the upload when the file cannot be read and send a SHARE_ABORT message', function (done) {
        messWithFilePath = true;

        buildFreshDownloadAndUpload(function () {
            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    uploaderMiddleware.once('sending', function () {
                        uploaderMiddleware.emit('canSend', true);
                    });

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.indexOf('ENOENT').should.be.above(-1);

                theDownload.once('killed', function (reason) {
                    reason.should.equal('Uploader aborted transfer.');
                    done();
                });
            });
        });
    });

    it('should kill the upload when reading a block renders an error (send SHARE_ABORT)', function (done) {
        messWithFilePath = false;

        buildFreshDownloadAndUpload(function () {
            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    uploaderMiddleware.once('sending', function () {
                        downloaderMiddleware.once('sending', function () {
                            theUpload._fileReader._fileDescriptor = -1;

                            uploaderMiddleware.once('sending', function () {
                                uploaderMiddleware.emit('canSend', true);
                            });

                            downloaderMiddleware.emit('canSend', true);
                        });

                        uploaderMiddleware.emit('canSend', true);
                    });

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.indexOf('EBADF').should.be.above(-1);

                theDownload.once('killed', function (reason) {
                    reason.should.equal('Uploader aborted transfer.');
                    done();
                });
            });
        });
    });

    it('should kill the upload if manually aborting while waiting for circuits for sending a block (send SHARE_ABORT)', function (done) {
        buildFreshDownloadAndUpload(function () {
            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    uploaderMiddleware.once('sending', function () {
                        downloaderMiddleware.once('sending', function () {
                            uploaderMiddleware.emit('circuitLength', 0);

                            uploaderMiddleware.once('sending', function () {
                                uploaderMiddleware.emit('canSend', true);
                            });

                            downloaderMiddleware.emit('canSend', true);

                            setTimeout(function () {
                                theUpload.manuallyAbort();
                            }, 100);
                        });

                        uploaderMiddleware.emit('canSend', true);
                    });

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Manually aborted.');

                theDownload.once('killed', function (reason) {
                    reason.should.equal('Uploader aborted transfer.');
                    done();
                });
            });
        });
    });

    it('should kill the upload if manually aborting while encrypting a block message (send SHARE_ABORT)', function (done) {
        uploaderCircuitLength = 1;

        buildFreshDownloadAndUpload(function () {
            uploaderMiddleware.once('sending', function () {
                downloaderMiddleware.once('sending', function (type, ident, payload) {
                    uploaderMiddleware.emit('circuitLength', 0);

                    uploaderMiddleware.once('sending', function () {
                        uploaderMiddleware.emit('canSend', true);
                    });

                    downloaderMiddleware.emit('canSend', true);

                    setTimeout(function () {
                        theUpload.once('uploadingBytes', function () {
                            theUpload.manuallyAbort();
                        });

                        uploaderMiddleware.emit('circuitLength', 1);
                    }, 100);

                    downloaderMiddleware.emit('canSend', true);
                });

                uploaderMiddleware.emit('canSend', true);
            });

            theUpload.kickOff();

            theUpload.once('killed', function (reason) {
                reason.should.equal('Manually aborted.');

                theDownload.once('killed', function (reason) {
                    reason.should.equal('Uploader aborted transfer.');
                    done();
                });
            });
        });
    });

    before(function () {
        removeFile();

        sandbox = sinon.sandbox.create();

        transferMessageCenterStub = testUtils.stubPublicApi(sandbox, TransferMessageCenter, {
            wrapTransferMessage: function (messageType, transferId, payload) {
                return writableFileTransferMessageFactory.constructMessage(transferId, messageType, payload);
            }
        });

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'fileTransfer.uploadBlockSizeInBytes')
                    return 204800;
            }
        });
    });

    after(function () {
        sandbox.restore();

        removeFile();
    });
});
//# sourceMappingURL=Upload.js.map
