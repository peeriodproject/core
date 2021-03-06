import DownloadFactoryInterface = require('./interfaces/DownloadFactoryInterface');
import DownloadInterface = require('./interfaces/DownloadInterface');
import Download = require('./Download');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesBlockMaintainerFactoryInterface = require('./interfaces/FeedingNodesBlockMaintainerFactoryInterface');
import FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');
import ShareMessengerFactoryInterface = require('./interfaces/ShareMessengerFactoryInterface');
import FileBlockWriterFactoryInterface = require('../../../fs/interfaces/FileBlockWriterFactoryInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import WritableShareRequestMessageFactory = require('./messages/WritableShareRequestMessageFactory');
import WritableEncryptedShareMessageFactory = require('./messages/WritableEncryptedShareMessageFactory');
import ReadableEncryptedShareMessageFactory = require('./messages/ReadableEncryptedShareMessageFactory');
import ReadableShareAbortMessageFactory = require('./messages/ReadableShareAbortMessageFactory');
import WritableShareAbortMessageFactory = require('./messages/WritableShareAbortMessageFactory');
import ReadableBlockMessageFactory = require('./messages/ReadableBlockMessageFactory');
import WritableBlockRequestMessageFactory = require('./messages/WritableBlockRequestMessageFactory');
import ReadableShareRatifyMessageFactory = require('./messages/ReadableShareRatifyMessageFactory');
import FeedingNodesMessageBlock = require('../messages/FeedingNodesMessageBlock');
import Aes128GcmWritableMessageFactory = require('../../hydra/messages/Aes128GcmWritableMessageFactory');
import Aes128GcmReadableDecryptedMessageFactory = require('../../hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

/**
 * DownloadFactoryInterface implementation using AES-128 in Galois counter mode for encryption/decryption/authentication
 * and zlib's compression for file writing.
 *
 * @class core.protocol.fileTransfer.share.Aes128GcmDownloadFactory
 * @implements core.protocol.fileTransfer.share.DownloadFactoryInterface
 *
 * @param {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} shareMessengerFactory
 * @param {core.fs.FileBlockWriterFactoryInterface} fileBlockWriterFactory
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
 */
class Aes128GcmDownloadFactory implements DownloadFactoryInterface {

	/**
	 * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_feedingNodesBlockMaintainerFactory
	 */
	private _feedingNodesBlockMaintainerFactory:FeedingNodesBlockMaintainerFactoryInterface = null;

	/**
	 * @member {core.fs.FileBlockWriterFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_fileBlockWriterFactory
	 */
	private _fileBlockWriterFactory:FileBlockWriterFactoryInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableBlockMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableBlockMessageFactory
	 */
	private _readableBlockMessageFactory:ReadableBlockMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableEncryptedShareMessageFactory
	 */
	private _readableEncryptedShareMessageFactory:ReadableEncryptedShareMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableShareAbortMessageFactory
	 */
	private _readableShareAbortMessageFactory:ReadableShareAbortMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_readableShareRatifyMessageFactory
	 */
	private _readableShareRatifyMessageFactory:ReadableShareRatifyMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_shareMessengerFactory
	 */
	private _shareMessengerFactory:ShareMessengerFactoryInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableBlockRequestMessageFactory
	 */
	private _writableBlockRequestMessageFactory:WritableBlockRequestMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableEncryptedShareMessageFactory
	 */
	private _writableEncryptedShareMessageFactory:WritableEncryptedShareMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableShareAbortMessageFactory
	 */
	private _writableShareAbortMessageFactory:WritableShareAbortMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableShareRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_writableShareRequestMessageFactory
	 */
	private _writableShareRequestMessageFactory:WritableShareRequestMessageFactory = null;

	public constructor (feedingNodesBlockMaintainerFactory:FeedingNodesBlockMaintainerFactoryInterface, shareMessengerFactory:ShareMessengerFactoryInterface, fileBlockWriterFactory:FileBlockWriterFactoryInterface, transferMessageCenter:TransferMessageCenterInterface) {
		this._feedingNodesBlockMaintainerFactory = feedingNodesBlockMaintainerFactory;
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

	public create (downloadFolder:string, filename:string, expectedSize:number, expectedHash:string, locationMetadata:any):DownloadInterface {

		var initialBlock:Buffer = null;
		try {
			initialBlock = FeedingNodesMessageBlock.constructBlock(locationMetadata);
		}
		catch (e) {
			return null;
		}

		return new Download(filename, expectedSize, expectedHash, initialBlock, this._feedingNodesBlockMaintainerFactory.create(), this._fileBlockWriterFactory.createWriter(downloadFolder, filename, expectedSize, expectedHash, true), this._shareMessengerFactory.createMessenger(), this._transferMessageCenter, this._writableShareRequestMessageFactory, this._writableEncryptedShareMessageFactory, this._readableEncryptedShareMessageFactory, this._readableShareAbortMessageFactory, this._writableShareAbortMessageFactory, this._readableBlockMessageFactory, this._readableShareRatifyMessageFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory(), this._writableBlockRequestMessageFactory);
	}

}

export = Aes128GcmDownloadFactory;
