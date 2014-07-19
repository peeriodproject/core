var Download = require('./Download');

var FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');

var WritableShareRequestMessageFactory = require('./messages/WritableShareRequestMessageFactory');
var WritableEncryptedShareMessageFactory = require('./messages/WritableEncryptedShareMessageFactory');
var ReadableEncryptedShareMessageFactory = require('./messages/ReadableEncryptedShareMessageFactory');
var ReadableShareAbortMessageFactory = require('./messages/ReadableShareAbortMessageFactory');
var WritableShareAbortMessageFactory = require('./messages/WritableShareAbortMessageFactory');
var ReadableBlockMessageFactory = require('./messages/ReadableBlockMessageFactory');
var WritableBlockRequestMessageFactory = require('./messages/WritableBlockRequestMessageFactory');
var ReadableShareRatifyMessageFactory = require('./messages/ReadableShareRatifyMessageFactory');
var FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
var Aes128GcmWritableMessageFactory = require('../../hydra/messages/Aes128GcmWritableMessageFactory');
var Aes128GcmReadableDecryptedMessageFactory = require('../../hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

/**
* DownloadFactoryInterface implementation using AES-128 in Galois counter mode for encryption/decryption/authentication.
*
* @class core.protocol.fileTransfer.share.Aes128GcmDownloadFactory
* @implements core.protocol.fileTransfer.share.DownloadFactoryInterface
*
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
* @param {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} shareMessengerFactory
* @param {core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface} fileBlockWriterFactory
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
*/
var Aes128GcmDownloadFactory = (function () {
    function Aes128GcmDownloadFactory(circuitManager, shareMessengerFactory, fileBlockWriterFactory, transferMessageCenter) {
        /**
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_circuitManager
        */
        this._circuitManager = null;
        /**
        * @member {core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_fileBlockWriterFactory
        */
        this._fileBlockWriterFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableBlockMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableBlockMessageFactory
        */
        this._readableBlockMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableEncryptedShareMessageFactory
        */
        this._readableEncryptedShareMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableShareAbortMessageFactory
        */
        this._readableShareAbortMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableShareRatifyMessageFactory
        */
        this._readableShareRatifyMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_shareMessengerFactory
        */
        this._shareMessengerFactory = null;
        /**
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableBlockRequestMessageFactory
        */
        this._writableBlockRequestMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableEncryptedShareMessageFactory
        */
        this._writableEncryptedShareMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableShareAbortMessageFactory
        */
        this._writableShareAbortMessageFactory = null;
        /**
        * @member {core.protocol.fileTransfer.share.WritableShareRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableShareRequestMessageFactory
        */
        this._writableShareRequestMessageFactory = null;
        this._circuitManager = circuitManager;
        this._shareMessengerFactory = shareMessengerFactory;
        this._fileBlockWriterFactory = fileBlockWriterFactory;
        this._transferMessageCenter = transferMessageCenter;
        this._writableShareRequestMessageFactory = new WritableShareRequestMessageFactory();
        this._writableEncryptedShareMessageFactory = new WritableEncryptedShareMessageFactory();
        this._readableEncryptedShareMessageFactory = new ReadableEncryptedShareMessageFactory();
        this._readableShareAbortMessageFactory = new ReadableShareAbortMessageFactory();
        this._writableShareAbortMessageFactory = new WritableShareAbortMessageFactory();
        this._readableBlockMessageFactory = new ReadableBlockMessageFactory();
        this._readableShareRatifyMessageFactory = new ReadableShareRatifyMessageFactory();
        this._writableBlockRequestMessageFactory = new WritableBlockRequestMessageFactory();
    }
    Aes128GcmDownloadFactory.prototype.create = function (filename, expectedSize, expectedHash, locationMetadata) {
        var initialBlock = null;
        try  {
            initialBlock = FeedingNodesMessageBlock.constructBlock(locationMetadata);
        } catch (e) {
            return null;
        }

        var feedingNodesBlockMaintainer = new FeedingNodesBlockMaintainer(this._circuitManager);

        return new Download(filename, expectedSize, expectedHash, initialBlock, feedingNodesBlockMaintainer, this._fileBlockWriterFactory, this._shareMessengerFactory.createMessenger(), this._transferMessageCenter, this._writableShareRequestMessageFactory, this._writableEncryptedShareMessageFactory, this._readableEncryptedShareMessageFactory, this._readableShareAbortMessageFactory, this._writableShareAbortMessageFactory, this._readableBlockMessageFactory, this._readableShareRatifyMessageFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory(), this._writableBlockRequestMessageFactory);
    };
    return Aes128GcmDownloadFactory;
})();

module.exports = Aes128GcmDownloadFactory;
//# sourceMappingURL=Aes128GcmDownloadFactory.js.map
