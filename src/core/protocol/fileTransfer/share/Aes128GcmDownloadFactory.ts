import DownloadFactoryInterface = require('./interfaces/DownloadFactoryInterface');
import DownloadInterface = require('./interfaces/DownloadInterface');
import Download = require('./Download');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesBlockMaintainer = require('./FeedingNodesBlockMaintainer');
import ShareMessengerFactoryInterface = require('./interfaces/ShareMessengerFactoryInterface');
import FileBlockWriterFactoryInterface = require('./interfaces/FileBlockWriterFactoryInterface');
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
class Aes128GcmDownloadFactory implements DownloadFactoryInterface {

	/**
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmDownloadFactory~_fileBlockWriterFactory
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

	public constructor (circuitManager:CircuitManagerInterface, shareMessengerFactory:ShareMessengerFactoryInterface, fileBlockWriterFactory:FileBlockWriterFactoryInterface, transferMessageCenter:TransferMessageCenterInterface) {
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

	public create (filename:string, expectedSize:number, expectedHash:string, locationMetadata:any):DownloadInterface {

		var initialBlock:Buffer = null;
		try {
			initialBlock = FeedingNodesMessageBlock.constructBlock(locationMetadata);
		}
		catch (e) {
			return null;
		}

		var feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface = new FeedingNodesBlockMaintainer(this._circuitManager);

		return new Download(filename, expectedSize, expectedHash, initialBlock, feedingNodesBlockMaintainer, this._fileBlockWriterFactory, this._shareMessengerFactory.createMessenger(), this._transferMessageCenter, this._writableShareRequestMessageFactory, this._writableEncryptedShareMessageFactory, this._readableEncryptedShareMessageFactory, this._readableShareAbortMessageFactory, this._writableShareAbortMessageFactory, this._readableBlockMessageFactory, this._readableShareRatifyMessageFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory(), this._writableBlockRequestMessageFactory);
	}

}

export = Aes128GcmDownloadFactory;
