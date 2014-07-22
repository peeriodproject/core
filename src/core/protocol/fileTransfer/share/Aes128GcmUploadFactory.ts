import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import UploadFactoryInterface = require('./interfaces/UploadFactoryInterface');
import UploadInterface = require('./interfaces/UploadInterface');
import Upload = require('./Upload');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FeedingNodesBlockMaintainerFactoryInterface = require('./interfaces/FeedingNodesBlockMaintainerFactoryInterface');
import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');
import ShareMessengerFactoryInterface = require('./interfaces/ShareMessengerFactoryInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import FileBlockReaderFactoryInterface = require('../../../fs/interfaces/FileBlockReaderFactoryInterface');
import FileBlockReaderInterface = require('../../../fs/interfaces/FileBlockReaderInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import WritableShareRatifyMessageFactory = require('./messages/WritableShareRatifyMessageFactory');
import ReadableShareRequestMessageFactory = require('./messages/ReadableShareRequestMessageFactory');
import WritableEncryptedShareMessageFactory = require('./messages/WritableEncryptedShareMessageFactory');
import ReadableEncryptedShareMessageFactory = require('./messages/ReadableEncryptedShareMessageFactory');
import ReadableShareAbortMessageFactory = require('./messages/ReadableShareAbortMessageFactory');
import WritableShareAbortMessageFactory = require('./messages/WritableShareAbortMessageFactory');
import WritableBlockMessageFactory = require('./messages/WritableBlockMessageFactory');
import ReadableBlockRequestMessageFactory = require('./messages/ReadableBlockRequestMessageFactory');
import Aes128GcmWritableMessageFactory = require('../../hydra/messages/Aes128GcmWritableMessageFactory');
import Aes128GcmReadableDecryptedMessageFactory = require('../../hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

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
class Aes128GcmUploadFactory implements UploadFactoryInterface {

	/**
	 * @member {number} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_blockSize
	 */
	private _blockSize:number = 0;

	/**
	 * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_feedingNodesBlockMaintainerFactory
	 */
	private _feedingNodesBlockMaintainerFactory:FeedingNodesBlockMaintainerFactoryInterface = null;

	/**
	 * @member {core.fs.FileBlockReaderFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_fileBlockReaderFactory
	 */
	private _fileBlockReaderFactory:FileBlockReaderFactoryInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableBlockRequestFactory
	 */
	private _readableBlockRequestFactory:ReadableBlockRequestMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableEncryptedShareFactory
	 */
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableShareAbortFactory
	 */
	private _readableShareAbortFactory:ReadableShareAbortMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_readableShareRequestFactory
	 */
	private _readableShareRequestFactory:ReadableShareRequestMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.ShareMessengerFactoryInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_shareMessengerFactory
	 */
	private _shareMessengerFactory:ShareMessengerFactoryInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableBlockMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableBlockFactory
	 */
	private _writableBlockFactory:WritableBlockMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableEncryptedShareFactory
	 */
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableShareAbortFactory
	 */
	private _writableShareAbortFactory:WritableShareAbortMessageFactory = null;

	/**
	 * @member {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactory} core.protocol.fileTransfer.share.Aes128GcmUploadFactory~_writableShareRatifyFactory
	 */
	private _writableShareRatifyFactory:WritableShareRatifyMessageFactory = null;

	public constructor (transferConfig:ConfigInterface, feedingNodesBlockMaintainerFactory:FeedingNodesBlockMaintainerFactoryInterface, shareMessengerFactory:ShareMessengerFactoryInterface, fileBlockReaderFactory:FileBlockReaderFactoryInterface, transferMessageCenter:TransferMessageCenterInterface) {
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

	public create (circuitIdOfRequest:string, requestTransferIdentifier:string, shareRequest:ReadableShareRequestMessageInterface, filepath:string, filename:string, filesize:number, filehash:string):UploadInterface {
		var fileReader:FileBlockReaderInterface = this._fileBlockReaderFactory.create(filepath, this._blockSize, true);
		var shareMessenger:ShareMessengerInterface = this._shareMessengerFactory.createMessenger();

		shareMessenger.manuallySetPreferredCircuitId(circuitIdOfRequest);

		return new Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, this._feedingNodesBlockMaintainerFactory.create(), this._transferMessageCenter, this._writableShareRatifyFactory, this._writableEncryptedShareFactory, this._readableEncryptedShareFactory, this._readableShareAbortFactory, this._writableShareAbortFactory, this._readableBlockRequestFactory, this._writableBlockFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());
	}

}

export = Aes128GcmUploadFactory;