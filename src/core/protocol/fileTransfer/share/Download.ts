import crypto = require('crypto');
import events = require('events');

import HKDF = require('../../../crypto/HKDF');
import Padding = require('../../../crypto/Padding');
import DownloadInterface = require('./interfaces/DownloadInterface');
import FeedingNodesBlockMaintainerInterface = require('./interfaces/FeedingNodesBlockMaintainerInterface');
import FileBlockWriterInterface = require('./interfaces/FileBlockWriterInterface');
import FileBlockWriterFactoryInterface = require('./interfaces/FileBlockWriterFactoryInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import WritableShareRequestMessageFactoryInterface = require('./messages/interfaces/WritableShareRequestMessageFactoryInterface');
import ReadableShareRatifyMessageFactoryInterface = require('./messages/interfaces/ReadableShareRatifyMessageFactoryInterface');
import WritableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageFactoryInterface = require('./messages/interfaces/ReadableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageInterface = require('./messages/interfaces/ReadableEncryptedShareMessageInterface');
import ReadableShareRatifyMessageInterface = require('./messages/interfaces/ReadableShareRatifyMessageInterface');
import ReadableBlockMessageInterface = require('./messages/interfaces/ReadableBlockMessageInterface');
import ReadableBlockMessageFactoryInterface = require('./messages/interfaces/ReadableBlockMessageFactoryInterface');
import ReadableShareAbortMessageInterface = require('./messages/interfaces/ReadableShareAbortMessageInterface');
import ReadableShareAbortMessageFactoryInterface = require('./messages/interfaces/ReadableShareAbortMessageFactoryInterface');
import WritableShareAbortMessageFactoryInterface = require('./messages/interfaces/WritableShareAbortMessageFactoryInterface');
import ReadableDecryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('../../hydra/messages/interfaces/WritableEncryptedMessageFactoryInterface');
import WritableBlockRequestMessageFactoryInterface = require('./messages/interfaces/WritableBlockRequestMessageFactoryInterface');
import ReadableDecryptedMessageInterface = require('../../hydra/messages/interfaces/ReadableDecryptedMessageInterface');

class Download extends events.EventEmitter implements DownloadInterface {

	private _filename:string = null;
	private _expectedSize:number = 0;
	private _expectedHash:string = null;
	private _initialFeedingNodesBlockBufferOfUploader:Buffer = null;
	private _feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface = null;
	private _fileBlockWriter:FileBlockWriterInterface = null;
	private _shareMessenger:ShareMessengerInterface = null;
	private _transferMessageCenter:TransferMessageCenterInterface = null;
	private _writableShareRequestFactory:WritableShareRequestMessageFactoryInterface = null;
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface = null;
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface = null;
	private _readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface = null;
	private _readableShareRatifyFactory:ReadableShareRatifyMessageFactoryInterface = null;
	private _writableShareAbortFactory:WritableShareAbortMessageFactoryInterface = null;
	private _writableBlockRequestFactory:WritableBlockRequestMessageFactoryInterface = null;
	private _readableBlockFactory:ReadableBlockMessageFactoryInterface = null;
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	private _killed:boolean = false;
	private _manuallyAborted:boolean = false;

	private _diffieHellman:crypto.DiffieHellman = null;
	private _incomingKey:Buffer = null;
	private _outgoingKey:Buffer = null;

	public constructor (filename:string, expectedSize:number, expectedHash:string, initialFeedingNodesBlockBufferOfUploader:Buffer,
		feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface, fileBlockWriterFactory:FileBlockWriterFactoryInterface,
		shareMessenger:ShareMessengerInterface, transferMessageCenter:TransferMessageCenterInterface, writableShareRequestFactory:WritableShareRequestMessageFactoryInterface,
		writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface, readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface,
		readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface, writableShareAbortFactory:WritableShareAbortMessageFactoryInterface,
		readableBlockFactory:ReadableBlockMessageFactoryInterface, readableShareRatifyFactory:ReadableShareRatifyMessageFactoryInterface, decrypter:ReadableDecryptedMessageFactoryInterface, encrypter:WritableEncryptedMessageFactoryInterface,
		writableBlockRequestFactory:WritableBlockRequestMessageFactoryInterface) {

		super();

		this._filename = filename;
		this._expectedSize = expectedSize;
		this._expectedHash = expectedHash;
		this._initialFeedingNodesBlockBufferOfUploader = initialFeedingNodesBlockBufferOfUploader;
		this._feedingNodesBlockMaintainer = feedingNodesBlockMaintainer;
		this._shareMessenger = shareMessenger;
		this._transferMessageCenter = transferMessageCenter;
		this._writableShareRequestFactory = writableShareRequestFactory;
		this._writableEncryptedShareFactory = writableEncryptedShareFactory;
		this._readableEncryptedShareFactory = readableEncryptedShareFactory;
		this._readableShareAbortFactory = readableShareAbortFactory;
		this._writableShareAbortFactory = writableShareAbortFactory;
		this._writableBlockRequestFactory = writableBlockRequestFactory;
		this._readableBlockFactory = readableBlockFactory;
		this._readableShareRatifyFactory = readableShareRatifyFactory;
		this._decrypter = decrypter;
		this._encrypter = encrypter;
		this._fileBlockWriter = fileBlockWriterFactory.createWriter(this._filename, this._expectedSize, this._expectedHash);

	}

	public kickOff ():void {
		// prepare the file block writer
		this._fileBlockWriter.prepareToWrite((err:Error) => {
			if (err) {
				this._kill(false, true, false, 'File cannot be written');
			}
			else {
				if (this._manuallyAborted) {
					this._kill(true, true, false, 'Manually aborted');
				}
				else {
					this._sendShareRequest();
				}
			}
		});
	}

	public manuallyAbort ():void {
		if (!this._manuallyAborted) {
			this._manuallyAborted = true;
			// only for internal stuff
			this.emit('internalAbort');

			// for external stuff, visual feedback etc.
			this.emit('abort');
		}
	}

	private _sendShareRequest ():void {
		this.emit('requestingFile');

		this._diffieHellman = crypto.getDiffieHellman('modp14');
		var dhPublicKey:Buffer = Padding.pad(this._diffieHellman.generateKeys(), 256);
		var transferIdentifier:string = crypto.pseudoRandomBytes(16).toString('hex');

		this._prepareToImmediateShare((err:Error) => {
			if (err) {
				this._kill(true, true, false, err.message);
			}
			else {
				var payload:Buffer = this._transferMessageCenter.wrapTransferMessage('SHARE_REQUEST', transferIdentifier, this._writableShareRequestFactory.constructMessage(this._feedingNodesBlockMaintainer.getBlock(), this._expectedHash, dhPublicKey));

				this._shareMessenger.pipeMessageAndWaitForResponse(payload, this._initialFeedingNodesBlockBufferOfUploader, 'SHARE_RATIFY', transferIdentifier, (err:Error, responsePayload:Buffer) => {
					if (err) {
						this._kill(true, true, false, err.message);
					}
					else {
						this._handleRatifyMessage(responsePayload, new Buffer(transferIdentifier, 'hex'));
					}
				});
			}
		});

	}

	private _sendBlockRequest (bytePosition:number, transferIdentToUse:string, nodesToFeedBlock:Buffer, isLast:boolean = false):void {
		this._prepareToImmediateShare((err:Error) => {
			if (err && !isLast) {
				this._kill(true, true, true, err.message, transferIdentToUse, nodesToFeedBlock);
			}
			else {
				var nextTransferIdentifier:string = crypto.pseudoRandomBytes(16).toString('hex');
				var blockRequestClear:Buffer = this._writableEncryptedShareFactory.constructMessage('BLOCK_REQUEST', this._writableBlockRequestFactory.constructMessage(this._feedingNodesBlockMaintainer.getBlock(), bytePosition, nextTransferIdentifier));

				this._encrypter.encryptMessage(this._outgoingKey, true, blockRequestClear, (err:Error, encryptedBuffer:Buffer) => {
					var sendableBuffer:Buffer = err ? null : this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', transferIdentToUse, encryptedBuffer);

					if (isLast) {
						if (sendableBuffer) {
							// if this is the last message, i.e. last acknowledge message, ignore any abort, as we are done anyway
							this._shareMessenger.pipeLastMessage(sendableBuffer, nodesToFeedBlock);
						}
						this._kill(false, true, false, 'Completed.');
					}
					else {
						var errorMessage:string = err ? 'Encryption error.' : null;
						errorMessage = this._manuallyAborted ? 'Manually aborted.' : errorMessage;

						if (errorMessage) {
							this._kill(true, true, true, errorMessage, transferIdentToUse, nodesToFeedBlock);
						}
						else {
							this._shareMessenger.pipeMessageAndWaitForResponse(sendableBuffer, nodesToFeedBlock, 'ENCRYPTED_SHARE', nextTransferIdentifier, (err:Error, responsePayload:Buffer) => {
								if (err) {
									this._kill(true, true, false, err.message);
								}
								else {
									this._handleBlockMessage(responsePayload, bytePosition);
								}
							});
						}
					}
				});
			}
		});
	}

	private _handleBlockMessage (payload:Buffer, expectedBytePosition:number):void {
		var decryptedMessage:ReadableDecryptedMessageInterface = null;
		var malformedMessageErr:string = null;

		try {
			decryptedMessage = this._decrypter.create(payload, this._incomingKey);
		}
		catch (e) {
			malformedMessageErr = 'Decryption error.';
		}

		if (decryptedMessage) {
			var shareMessage:ReadableEncryptedShareMessageInterface = this._readableEncryptedShareFactory.create(decryptedMessage.getPayload());

			if (!shareMessage) {
				malformedMessageErr = 'Malformed share message.';
			}
			else {
				if (shareMessage.getMessageType() === 'SHARE_ABORT') {
					var shareAbortMessage:ReadableShareAbortMessageInterface = this._readableShareAbortFactory.create(shareMessage.getPayload());

					if (!shareAbortMessage ) {
						malformedMessageErr = 'Malformed abort message.';
					}
					else if (!(shareAbortMessage.getFileHash() === this._expectedHash && shareAbortMessage.getFilename() === this._filename && shareAbortMessage.getFilesize() === this._expectedSize)) {
						malformedMessageErr = 'File properties do not match in abort message.';
					}
					else {
						malformedMessageErr = 'Uploader aborted transfer.';
					}

				}
				else if (shareMessage.getMessageType() === 'BLOCK') {
					var blockMessage:ReadableBlockMessageInterface = this._readableBlockFactory.create(shareMessage.getPayload());

					if (!blockMessage || blockMessage.getFirstBytePositionOfBlock() !== expectedBytePosition) {
						malformedMessageErr = 'Malformed block message.';
					}
					else {
						if (this._manuallyAborted) {
							this._kill(true, true, true, 'Manually aborted.', blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
						}
						else {
							// everything okay so for. pass to the file writer.
							this._fileBlockWriter.writeBlock(blockMessage.getDataBlock(), (err:Error, fullCountOfWrittenBytes:number, isFinished:boolean) => {
								if (isFinished) {
									// finalize it
									this._sendBlockRequest(fullCountOfWrittenBytes, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock(), true);

									if (!this._manuallyAborted) {
										this.emit('completed');
									}
								}
								else {
									var errorMessage:string = err ? err.message : null;
									errorMessage = this._manuallyAborted ? 'Manually aborted.' : errorMessage;

									if (errorMessage) {
										this._kill(true, true, true, errorMessage, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
									}
									else {
										this.emit('writtenBytes', fullCountOfWrittenBytes);
										this._sendBlockRequest(fullCountOfWrittenBytes, blockMessage.getNextTransferIdentifier(), blockMessage.getFeedingNodesBlock());
									}
								}
							});
						}
					}
				}
				else {
					malformedMessageErr = 'Prohibited message type.';
				}
			}
		}

		if (malformedMessageErr) {
			this._kill(true, true, false, malformedMessageErr);
			this._shareMessenger.teardownLatestCircuit();
		}
	}

	private _handleRatifyMessage (payload:Buffer, prevTransferIdent:Buffer):void {
		var ratifyMessage:ReadableShareRatifyMessageInterface = this._readableShareRatifyFactory.create(payload);
		var malformedMessageErr:string = null;

		if (!ratifyMessage) {
			malformedMessageErr = 'Malformed message.';
		}
		else {
			var secret:Buffer = this._diffieHellman.computeSecret(ratifyMessage.getDHPayload());
			var sha1:string = crypto.createHash('sha1').update(secret).digest('hex');

			if (sha1 !== ratifyMessage.getSecretHash().toString('hex')) {
				malformedMessageErr = 'Hashes of secret do not match.';
			}
			else {
				// derive keys and the identifier
				var hkdf:HKDF = new HKDF('sha256', secret);
				var keysConcat:Buffer = hkdf.derive(48, prevTransferIdent);

				this._outgoingKey = keysConcat.slice(0, 16);
				this._incomingKey = keysConcat.slice(16, 32);

				var nextTransferIdentifier:string = keysConcat.slice(32).toString('hex');

				// decrypt the encrypted part
				var decryptedPart:ReadableDecryptedMessageInterface = null;

				try {
					decryptedPart = this._decrypter.create(ratifyMessage.getEncryptedPart(), this._incomingKey);
				}
				catch (e) {
					malformedMessageErr = 'Decryption error.';
				}

				if (decryptedPart) {
					var deformatted:boolean = false;

					try {
						ratifyMessage.deformatDecryptedPart(decryptedPart.getPayload());
						deformatted = true;
					}
					catch (e) {
						malformedMessageErr = 'Malformed decrypted message.';
					}

					if (deformatted) {
						var nodesToFeedBlock:Buffer = ratifyMessage.getDeformattedDecryptedFeedingNodesBlock();
						var filename:string = ratifyMessage.getDeformattedDecryptedFilename();
						var size:number = ratifyMessage.getDeformattedDecryptedFileSize();

						if (!(filename === this._filename && size === this._expectedSize)) {
							malformedMessageErr = 'Filename and size do not match requested file.';
						}
						else {
							// everything is well, now only check if shit has been aborted
							if (this._manuallyAborted) {
								this._kill(true, true, true, 'Manually aborted.', nextTransferIdentifier, nodesToFeedBlock);
							}
							else {
								// fine until here, begin requesting the blocks
								this.emit('startingTransfer');
								this._sendBlockRequest(0, nextTransferIdentifier, nodesToFeedBlock);
							}
						}
					}
				}
			}
		}

		if (malformedMessageErr) {
			this._kill(true, true, false, malformedMessageErr);
			this._shareMessenger.teardownLatestCircuit();
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

	private _kill (abortFileWriter:boolean, abortBlockMaintainer:boolean, sendLastAbortMessage:boolean, message:string, lastMessageIdentifier?:string, lastMessageNodesToFeedBlock?:Buffer):void {
		if (!this._killed) {
			this._killed = true;

			if (abortFileWriter) {
				this._fileBlockWriter.abort(null);
			}
			if (abortBlockMaintainer) {
				this._feedingNodesBlockMaintainer.cleanup();
			}
			if (sendLastAbortMessage) {
				var lastMessageClearText:Buffer = this._writableEncryptedShareFactory.constructMessage('SHARE_ABORT', this._writableShareAbortFactory.constructMessage(this._expectedSize, this._filename, this._expectedHash));

				this._encrypter.encryptMessage(this._outgoingKey, true, lastMessageClearText, (err:Error, encryptedPayload:Buffer) => {
					if (!err) {
						var payloadToFeed:Buffer = this._transferMessageCenter.wrapTransferMessage('ENCRYPTED_SHARE', lastMessageIdentifier, encryptedPayload);
						this._shareMessenger.pipeLastMessage(payloadToFeed, lastMessageNodesToFeedBlock);
					}
				});
			}

			this.removeAllListeners('internalAbort');
			this.removeAllListeners('abort');
			this.removeAllListeners('startingTransfer');
			this.removeAllListeners('requestingFile');
			this.removeAllListeners('completed');
			this.emit('killed', message);
		}
	}

}

export = Download;