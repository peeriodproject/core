var Upload = require('./Upload');

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

/**
* UploadFactoryInterface implementation using AES-128 in Galois counter mode for encryption/decryption/authentication
* and zlib's compression for file reading.
*
* @class core.protocol.fileTransfer.share.Aes128GcmUploadFactory
* @implements core.protocol.fileTransfer.share.UploadFactoryInterface
*
* @param {core.config.ConfigInterface} transferConfig
* @param {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface} feedingNodesBlockMaintainerFactory
* @param {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} shareMessengerFactory
* @param {core.fs.FileBlockReaderFactoryInterface} fileBlockReaderFactory
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
*/
var Aes128GcmUploadFactory = (function () {
    function Aes128GcmUploadFactory(transferConfig, feedingNodesBlockMaintainerFactory, shareMessengerFactory, fileBlockReaderFactory, transferMessageCenter) {
        /**
        * @member {number} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_blockSize
        */
        this._blockSize = 0;
        /**
        * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_feedingNodesBlockMaintainerFactory
        */
        this._feedingNodesBlockMaintainerFactory = null;
        /**
        * @member {core.fs.FileBlockReaderFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_fileBlockReaderFactory
        */
        this._fileBlockReaderFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableBlockRequestFactory
        */
        this._readableBlockRequestFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableEncryptedShareFactory
        */
        this._readableEncryptedShareFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableShareAbortFactory
        */
        this._readableShareAbortFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableShareRequestFactory
        */
        this._readableShareRequestFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_shareMessengerFactory
        */
        this._shareMessengerFactory = null;
        /**
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableBlockMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableBlockFactory
        */
        this._writableBlockFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableEncryptedShareFactory
        */
        this._writableEncryptedShareFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableShareAbortFactory
        */
        this._writableShareAbortFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableShareRatifyFactory
        */
        this._writableShareRatifyFactory = null;
        this._blockSize = transferConfig.get('fileTransfer.uploadBlockSizeInBytes');
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
        this._feedingNodesBlockMaintainerFactory = feedingNodesBlockMaintainerFactory;
    }
    Aes128GcmUploadFactory.prototype.create = function (circuitIdOfRequest, requestTransferIdentifier, shareRequest, filepath, filename, filesize, filehash) {
        var fileReader = this._fileBlockReaderFactory.create(filepath, this._blockSize, true);
        var shareMessenger = this._shareMessengerFactory.createMessenger();

        shareMessenger.manuallySetPreferredCircuitId(circuitIdOfRequest);

        return new Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, this._feedingNodesBlockMaintainerFactory.create(), this._transferMessageCenter, this._writableShareRatifyFactory, this._writableEncryptedShareFactory, this._readableEncryptedShareFactory, this._readableShareAbortFactory, this._writableShareAbortFactory, this._readableBlockRequestFactory, this._writableBlockFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());
    };
    return Aes128GcmUploadFactory;
})();

module.exports = Aes128GcmUploadFactory;
//# sourceMappingURL=Aes128GcmUploadFactory.js.map
