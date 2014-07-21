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

class Aes128GcmUploadFactory implements UploadFactoryInterface {

	private _blockSize:number = 0;

	private _circuitManager:CircuitManagerInterface = null;
	private _shareMessengerFactory:ShareMessengerFactoryInterface = null;
	private _fileBlockReaderFactory:FileBlockReaderFactoryInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	private _writableShareRatifyFactory:WritableShareRatifyMessageFactory = null;
	private _readableShareRequestFactory:ReadableShareRequestMessageFactory = null;
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactory = null;
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactory = null;
	private _readableShareAbortFactory:ReadableShareAbortMessageFactory = null;
	private _writableShareAbortFactory:WritableShareAbortMessageFactory = null;
	private _writableBlockFactory:WritableBlockMessageFactory = null;
	private _readableBlockRequestFactory:ReadableBlockRequestMessageFactory = null;
	private _feedingNodesBlockMaintainerFactory:FeedingNodesBlockMaintainerFactoryInterface = null;

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
		var fileReader:FileBlockReaderInterface = this._fileBlockReaderFactory.create(filepath, this._blockSize);
		var shareMessenger:ShareMessengerInterface = this._shareMessengerFactory.createMessenger();

		shareMessenger.manuallySetPreferredCircuitId(circuitIdOfRequest);

		return new Upload(requestTransferIdentifier, shareRequest, filename, filesize, filehash, fileReader, shareMessenger, this._feedingNodesBlockMaintainerFactory.create(), this._transferMessageCenter, this._writableShareRatifyFactory, this._writableEncryptedShareFactory, this._readableEncryptedShareFactory, this._readableShareAbortFactory, this._writableShareAbortFactory, this._readableBlockRequestFactory, this._writableBlockFactory, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());
	}

}

export = Aes128GcmUploadFactory;