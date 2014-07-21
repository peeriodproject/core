var Upload = require('./Upload');
var FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');

var WritableShareRatifyMessageFactory = require('./messages/WritableShareRatifyMessageFactory');
var ReadableShareRequestMessageFactory = require('./messages/ReadableShareRequestMessageFactory');
var WritableEncryptedShareMessageFactory = require('./messages/WritableEncryptedShareMessageFactory');
var ReadableEncryptedShareMessageFactory = require('./messages/ReadableEncryptedShareMessageFactory');
var ReadableShareAbortMessageFactory = require('./messages/ReadableShareAbortMessageFactory');
var WritableShareAbortMessageFactory = require('./messages/WritableShareAbortMessageFactory');
var WritableBlockMessageFactory = require('./messages/WritableBlockMessageFactory');
var ReadableBlockRequestMessageFactory = require('./messages/ReadableBlockRequestMessageFactory');
var Aes128GcmWritableMessageFactory = require('../../hydra/messages/Aes128GcmWritableMessageFactory');
var Aes128GcmReadableDecryptedMessageFactory = require('../../hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

var Aes128GcmUploadFactory = (function () {
    function Aes128GcmUploadFactory(transferConfig, circuitManager, shareMessengerFactory, fileBlockReaderFactory, transferMessageCenter) {
        this._blockSize = 0;
        this._circuitManager = null;
        this._shareMessengerFactory = null;
        this._fileBlockReaderFactory = null;
        this._transferMessageCenter = null;
        this._writableShareRatifyFactory = null;
        this._readableShareRequestFactory = null;
        this._writableEncryptedShareFactory = null;
        this._readableEncryptedShareFactory = null;
        this._readableShareAbortFactory = null;
        this._writableShareAbortFactory = null;
        this._writableBlockFactory = null;
        this._readableBlockRequestFactory = null;
        this._blockSize = transferConfig.get('fileTransfer.uploadBlockSizeInBytes');
        this._circuitManager = circuitManager;
        this._shareMessengerFactory = shareMessengerFactory;
        this._fileBlockReaderFactory = fileBlockReaderFactory;
        this._transferMessageCenter = transferMessageCenter;
        this._writableShareRatifyFactory = new WritableShareRatifyMessageFactory();
        this._readableShareRequestFactory = new ReadableShareRequestMessageFactory();
        this._writableEncryptedShareFactory = new WritableEncryptedShareMessageFactory();
        this._readableEncryptedShareFactory = new ReadableEncryptedShareMessageFactory();
        this._readableShareAbortFactory = new ReadableShareAbortMessageFactory();
        this._writableShareAbortFactory = new WritableShareAbortMessageFactory();
        this._writableBlockFactory = new WritableBlockMessageFactory();
        this._readableBlockRequestFactory = new ReadableBlockRequestMessageFactory();
    }
    Aes128GcmUploadFactory.prototype.create = function (circuitIdOfRequest, requestTransferIdentifier, shareRequest, filepath, filename, filesize, filehash) {
        var fileReader = this._fileBlockReaderFactory.create(filepath, this._blockSize);
        var shareMessenger = this._shareMessengerFactory.createMessenger();
        var feedingNodesBlockMaintainer = new FeedingNodesBlockMaintainer(this._circuitManager);

        shareMessenger.manuallySetPreferredCircuitId(circuitIdOfRequest);

        return new Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, feedingNodesBlockMaintainer, this._transferMessageCenter, this._writableShareRatifyFactory, this._writableEncryptedShareFactory, this._readableEncryptedShareFactory, this._readableShareAbortFactory, this._writableShareAbortFactory, this._readableBlockRequestFactory, this._writableBlockFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());
    };
    return Aes128GcmUploadFactory;
})();

module.exports = Aes128GcmUploadFactory;
//# sourceMappingURL=Aes128GcmUploadFactory.js.map
