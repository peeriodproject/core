import events = require('events');
import crypto = require('crypto');

import HKDF = require('../../../crypto/HKDF');
import Padding = require('../../../crypto/Padding');

import UploadInterface = require('./interfaces/UploadInterface');
import FileBlockReaderInterface = require('../../../fs/interfaces/FileBlockReaderInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');

import ReadableShareRequestMessageInterface = require('./messages/interfaces/ReadableShareRequestMessageInterface');
import WritableShareRatifyMessageFactoryInterface = require('./messages/interfaces/WritableShareRatifyMessageFactoryInterface');
import WritableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/ReadableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageInterface = require('./messages/interfaces/ReadableEncryptedShareMessageInterface');
import ReadableShareAbortMessageFactoryInterface = require('./messages/interfaces/ReadableShareAbortMessageFactoryInterface');
import ReadableShareAbortMessageInterface = require('./messages/interfaces/ReadableShareAbortMessageInterface');
import WritableShareAbortMessageFactoryInterface = require('./messages/interfaces/WritableShareAbortMessageFactoryInterface');
import ReadableBlockRequestMessageFactoryInterface = require('./messages/interfaces/ReadableBlockRequestMessageFactoryInterface');
import ReadableBlockRequestMessageInterface = require('./messages/interfaces/ReadableBlockRequestMessageInterface');
import WritableBlockMessageFactoryInterface = require('./messages/interfaces/WritableBlockMessageFactoryInterface');
import ReadableDecryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import ReadableDecryptedMessageInterface = require('../../hydra/messages/interfaces/ReadableDecryptedMessageInterface');
import WritableEncryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/WritableEncryptedMessageFactoryInterface');

class Upload extends events.EventEmitter implements UploadInterface {

	private _filename:string = null;
	private _filesize:number = 0;
	private _filehash:string = null;
	private _initialFeedingNodesBlockOfDownloader:Buffer = null;
	private _fileReader:FileBlockReaderInterface = null;
	private _shareMessenger:ShareMessengerInterface = null;
	private _downloaderDHPayload:Buffer = null;
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
	private _requestTransferIdentifier:string = null;

	private _incomingKey:Buffer = null;
	private _outgoingKey:Buffer = null;

	private _killed:boolean = false;
	private _manuallyAborted:boolean = false;
	private _fdOpen:boolean = false;

	public constructor (requestTransferIdentifier:string, shareRequest:ReadableShareRequestMessageInterface, filename:string, filesize:number, filehash:string,
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
		this._downloaderDHPayload = shareRequest.getDHPayload();
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
		this._requestTransferIdentifier = requestTransferIdentifier;
		this._decrypter = decrypter;
		this._encrypter = encrypter;
	}

	public kickOff ():void {
		this._sendShareRatify();
	}

	public manuallyAbort ():void {
		if (!this._manuallyAborted && !this._killed) {
			this._manuallyAborted = true;
			// only for internal stuff
			this.emit('internalAbort');

			// for external stuff, visual feedback etc.
			this.emit('abort');
		}
	}

	private _kill (sendLastAbortMessage:boolean, message:string, lastMessageIdentifier?:string, lastMessageNodesToFeedBlock?:Buffer):void {
		if (!this._killed) {
			this._killed = true;

			if (this._fileReader.canBeRead()) {
				this._fileReader.abort(null);
			}

			this._feedingNodesBlockMaintainer.cleanup();

			if (sendLastAbortMessage) {
				var lastMessageClearText:Buffer = this._writableEncryptedShareFactory.constructMessage('SHARE_ABORT', this._writableShareAbortFactory.constructMessage(this._filesize, this._filename, this._filehash));

				this._encrypter.encryptMessage(this._outgoingKey, true, lastMessageClearText, (err:Error, encryptedPayload:Buffer) => {
					if (!err) {
						var payloadToFeed:Buffer = this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', lastMessageIdentifier, encryptedPayload);
						this._shareMessenger.pipeLastMessage(payloadToFeed, lastMessageNodesToFeedBlock);
					}
				});
			}

			this.removeAllListeners('internalAbort');
			this.removeAllListeners('abort');
			this.removeAllListeners('ratifyingRequest');
			this.removeAllListeners('uploadingBytes');
			this.removeAllListeners('completed');
			this.removeAllListeners('startingUpload');

			this.emit('killed', message);

			this.removeAllListeners('killed');
		}
	}

	private _prepareToImmediateShare (callback:(err:Error) => any):void {
		if (this._feedingNodesBlockMaintainer.getCurrentNodeBatch().length) {
			callback(null);
		}
		else {
			var nodeBatchLengthListener:Function = () => {
				this.removeAllListeners('internalAbort');
				callback(null);
			};

			this.once('internalAbort', () => {
				this._feedingNodesBlockMaintainer.removeListener('nodeBatchLength', nodeBatchLengthListener);
				callback(new Error('Manually aborted.'));
			});

			this._feedingNodesBlockMaintainer.once('nodeBatchLength', nodeBatchLengthListener);
		}
	}

	private _handleMessengerResponse (err:Error, responsePayload:Buffer):void {
		if (err) {
			this._kill(false, err.message);
		}
		else {
			var decryptedMessage:ReadableDecryptedMessageInterface = this._decrypter.create(responsePayload, this._incomingKey);
			var malformedMessageErr:string = null;
			var teardownOnError:boolean = true;

			if (!decryptedMessage) {
				malformedMessageErr = 'Decryption error.';
			}
			else {
				var shareMessage:ReadableEncryptedShareMessageInterface = this._readableEncryptedShareFactory.create(decryptedMessage.getPayload());

				if (!shareMessage) {
					malformedMessageErr = 'Malformed share message.';
				}
				else {
					if (shareMessage.getMessageType() === 'SHARE_ABORT') {
						var shareAbortMessage:ReadableShareAbortMessageInterface = this._readableShareAbortFactory.create(shareMessage.getPayload());

						if (!shareAbortMessage) {
							malformedMessageErr = 'Malformed abort message.'
						}
						else if (!(shareAbortMessage.getFileHash() === this._filehash && shareAbortMessage.getFilename() === this._filename && shareAbortMessage.getFilesize() === this._filesize)) {
							malformedMessageErr = 'File properties do not match in abort message.'
						}
						else {
							malformedMessageErr = 'Downloader aborted transfer.';
							teardownOnError = false;
						}
					}
					else if (shareMessage.getMessageType() === 'BLOCK_REQUEST') {

						var blockRequest:ReadableBlockRequestMessageInterface = this._readableBlockRequestFactory.create(shareMessage.getPayload());

						if (!blockRequest || blockRequest.getFirstBytePositionOfBlock() > this._filesize) {
							malformedMessageErr = 'Malformed block request.';
						}
						else {
							if (blockRequest.getFirstBytePositionOfBlock() === this._filesize) {
								// we are done
								this.emit('completed');

								this._kill(false, 'Completed.');
							}
							else if (this._manuallyAborted) {
								this._kill(true, 'Manually aborted.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
							}
							else {

								// everything okay so far. read from file.
								if (!this._fdOpen) {
									this._fileReader.prepareToRead((err:Error) => {
										if (err) {
											this._kill(true, 'File cannot be read.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
										}
										else {
											this.emit('startingUpload');
											this._fdOpen = true;
											this._readBlockAndSendByRequest(blockRequest);
										}
									});
								}
								else {
									this._readBlockAndSendByRequest(blockRequest);
								}

							}
						}
					}
					else {
						malformedMessageErr = 'Prohibited message type.';
					}
				}
			}

			if (malformedMessageErr) {
				if (teardownOnError) {
					this._shareMessenger.teardownLatestCircuit();
				}

				this._kill(false, malformedMessageErr);
			}
		}
	}

	private _readBlockAndSendByRequest (blockRequest:ReadableBlockRequestMessageInterface):void {
		var firstByteOfBlock:number = blockRequest.getFirstBytePositionOfBlock();


		this._fileReader.readBlock(firstByteOfBlock, (err:Error, readBytes:Buffer) => {
			var errorMessage:string = err ? err.message : null;
			errorMessage = this._manuallyAborted ? 'Manually aborted.' : errorMessage;

			if (errorMessage) {
				this._kill(true, 'Block cannot be read.', blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
			}
			else {
				this._prepareToImmediateShare((err:Error) => {

					if (err) {
						this._kill(true, err.message, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
					}
					else {
						this.emit('uploadingBytes', readBytes.length);

						var nextTransferIdentifier:string = crypto.pseudoRandomBytes(16).toString('hex');
						var blockClear:Buffer = this._writableEncryptedShareFactory.constructMessage('BLOCK', this._writableBlockFactory.constructMessage(this._feedingNodesBlockMaintainer.getBlock(), firstByteOfBlock, nextTransferIdentifier, readBytes));

						this._encrypter.encryptMessage(this._outgoingKey, true, blockClear, (err:Error, encryptedBuffer:Buffer) => {
							var errorMessage:string = err ? 'Encryption error.' : null;
							errorMessage = this._manuallyAborted ? 'Manually aborted.' : errorMessage;

							if (errorMessage) {
								this._kill(true, errorMessage, blockRequest.getNextTransferIdentifier(), blockRequest.getFeedingNodesBlock());
							}
							else {
								var sendableBuffer:Buffer = this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', blockRequest.getNextTransferIdentifier(), encryptedBuffer);
								this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, blockRequest.getFeedingNodesBlock(), 'ENCRYPTED_SHARE', nextTransferIdentifier, (err:Error, responsePayload:Buffer) => {
									this._handleMessengerResponse(err, responsePayload);
								});
							}
						});
					}
				});
			}
		});
	}

	private _sendShareRatify ():void {
		this.emit('ratifyingRequest');

		var diffieHellman:crypto.DiffieHellman = crypto.getDiffieHellman('modp14');
		var dhPublic:Buffer = Padding.pad(diffieHellman.generateKeys(), 256);
		var secret:Buffer = diffieHellman.computeSecret(this._downloaderDHPayload);
		var sha1:Buffer = crypto.createHash('sha1').update(secret).digest();

		// so far, so good, now derive the keys
		var hkdf:HKDF = new HKDF('sha256', secret);
		var keysConcat:Buffer = hkdf.derive(48, new Buffer(this._requestTransferIdentifier, 'hex'));

		this._incomingKey = keysConcat.slice(0, 16);
		this._outgoingKey = keysConcat.slice(16, 32);

		var expectedTransferIdentifier:string = keysConcat.slice(32).toString('hex');

		// we have everything, prepare to send
		this._prepareToImmediateShare((err:Error) => {
			if (err) {
				this._kill(false, err.message);
			}
			else {
				var partToEncrypt:Buffer = this._writableShareRatifyFactory.constructPartToEncrypt(this._feedingNodesBlockMaintainer.getBlock(), this._filesize, this._filename);

				this._encrypter.encryptMessage(this._outgoingKey, true, partToEncrypt, (err:Error, encryptedBuffer:Buffer) => {
					var errorMessage:string = err ? 'Encryption error.' : null;
					errorMessage = this._manuallyAborted ? 'Manually aborted.' : errorMessage;

					if (errorMessage) {
						this._kill(false, errorMessage);
					}
					else {
						var ratifyPayload:Buffer = this._writableShareRatifyFactory.constructMessage(dhPublic, sha1, encryptedBuffer);
						var sendableBuffer:Buffer = this._transferMessageCenter.wrapTransferMessage('SHARE_RATIFY', this._requestTransferIdentifier, ratifyPayload);

						this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, this._initialFeedingNodesBlockOfDownloader, 'ENCRYPTED_SHARE', expectedTransferIdentifier, (err:Error, responsePayload:Buffer) => {
							this._handleMessengerResponse(err, responsePayload);
						});
					}
				});
			}
		});

	}
}

export = Upload;