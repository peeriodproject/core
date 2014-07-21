import events = require('events');
import crypto = require('crypto');

import HKDF = require('../../../crypto/HKDF');
import Padding = require('../../../crypto/Padding');

import UploadInterface = require('./interfaces/UploadInterface');
import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');

import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');
import WritableShareRatifyMessageFactoryInterface = require('./messages/interfaces/WritableShareRatifyMessageFactoryInterface');
import WritableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/ReadableEncryptedShareMessageFactoryInterface');
import ReadableShareAbortMessageFactoryInterface = require('./messages/interfaces/ReadableShareAbortMessageFactoryInterface');
import WritableShareAbortMessageFactoryInterface = require('./messages/interfaces/WritableShareAbortMessageFactoryInterface');
import ReadableBlockRequestMessageFactoryInterface = require('./messages/interfaces/ReadableBlockRequestMessageFactoryInterface');
import WritableBlockMessageFactoryInterface = require('./messages/interfaces/WritableBlockMessageFactoryInterface');
import ReadableDecryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/WritableEncryptedMessageFactoryInterface');

class Upload extends events.EventEmitter implements UploadInterface {

	private _filename:string = null;
	private _filesize:number = 0;
	private _filehash:string = null;
	private _initialFeedingNodesBlockOfDownloader:Buffer = null;
	private _fileReader:FileBlockReaderInterface = null;
	private _shareMessenger:ShareMessengerInterface = null;
	private _feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _writableShareRatifyFactory:WritableShareRatifyMessageFactoryInterface = null;
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface = null;
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface = null;
	private _readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface = null;
	private _writableShareAbortFactory:WritableShareAbortMessageFactoryInterface = null;
	private _readableBlockRequestFactory:ReadableBlockRequestMessageFactoryInterface = null;
	private _writableBlockFactory:WritableBlockMessageFactoryInterface = null;
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	public constructor (shareRequest:ReadableShareRequestMessageInterface, filename:string, filesize:number, filehash:string,
		fileReader:FileBlockReaderInterface, shareMessenger:ShareMessengerInterface, feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface,
		transferMessageCenter:TransferMessageCenterInterface, writableShareRatifyFactory:WritableShareRatifyMessageFactoryInterface,
		writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface, readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface,
		readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface, writableShareAbortFactory:WritableShareAbortMessageFactoryInterface,
		readableBlockRequestFactory:ReadableBlockRequestMessageFactoryInterface, writableBlockFactory:WritableBlockMessageFactoryInterface,
		decrypter:ReadableDecryptedMessageFactoryInterface, encrypter:WritableEncryptedMessageFactoryInterface
		) {

		super();

		this._filename = filename;
		this._filesize = filesize;
		this._filehash = filehash;
		this._initialFeedingNodesBlockOfDownloader = shareRequest.getFeedingNodesBlock();
		this._fileReader = fileReader;
		this._shareMessenger = shareMessenger;
		this._feedingNodesBlockMaintainer = feedingNodesBlockMaintainer;
		this._transferMessageCenter = transferMessageCenter;
		this._writableShareRatifyFactory = writableShareRatifyFactory;
		this._writableEncryptedShareFactory = writableEncryptedShareFactory;
		this._readableEncryptedShareFactory = readableEncryptedShareFactory;
		this._readableShareAbortFactory = readableShareAbortFactory;
		this._writableShareAbortFactory = writableShareAbortFactory;
		this._readableBlockRequestFactory = readableBlockRequestFactory;
		this._writableBlockFactory = writableBlockFactory;
		this._decrypter = decrypter;
		this._encrypter = encrypter;

	}

	public manuallyAbort ():void {
		// @todo
	}
}

export = Upload;