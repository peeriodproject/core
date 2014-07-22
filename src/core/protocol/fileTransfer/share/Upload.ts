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


/**
 * UploadInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.Upload
 * @implements core.protocol.fileTransfer.share.UploadInterface
 *
 * @param {string} requestTransferIdentifier The transfer identifier of the SHARE_REQUEST message the upload bases upon. This identifier will be used for the SHARE_RATIFY message.
 * @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} The SHARE_REQUEST message the upload bases upon.
 * @param {string} filename The name of the requested file.
 * @param {number} filesize The number of bytes of the requested file.
 * @param {string} filehash Hexadecimal string representation of the SHA-1 hash of the requested file.
 * @param {core.fs.FileBlockReaderInterface} fileBlockReader Block reader of the requested file.
 * @param {core.protocol.fileTransfer.share.ShareMessengerInterface} shareMessenger Fresh share messenger instance.
 * @param {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} feedingNodesBlockMaintainer Fresh feeding nodes block maintainer instance.
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter Working transfer message center instance.
 * @param {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface} writableShareRatifyFactory
 * @param {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} writableEncryptedShareFactory
 * @param {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} readableEncryptedShareFactory
 * @param {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} readableShareAbortFactory
 * @param {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} writableShareAbortFactory
 * @param {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface} readableBlockRequestFactory
 * @param {core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface} writableBlockFactory
 * @param {core.protocol.hydra.ReadableDecryptedMessageFactory} decrypter Factory for decrypting messages (e.g. AES-128-GCM factory)
 * @param {core.protocol.hydra.WritableEncryptedMessageFactory} encrypter Factory for encrypting messages (e.g. AES-128-GCM factory)
 */
class Upload extends events.EventEmitter implements UploadInterface {

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_decrypter
	 */
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;

	/**
	 * Stores the Diffie-Hellman public key of the downloader received with the SHARE_REQUEST message.
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Upload~_downloaderDHPayload
	 */
	private _downloaderDHPayload:Buffer = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_encrypter
	 */
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	/**
	 * Indicates whether the file to be read has been open or not. This is to ensure that the file block reader is only
	 * cleaned up when necessary.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.Upload~_fdOpen
	 */
	private _fdOpen:boolean = false;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} core.protocol.fileTransfer.share.Upload~_feedingNodesBlockMaintainer
	 */
	private _feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface = null;

	/**
	 * Stores the SHA-1 hash of the requested file.
	 *
	 * @member {string} core.protocol.fileTransfer.share.Upload~_filehash
	 */
	private _filehash:string = null;

	/**
	 * Stores the name of the requested file.
	 *
	 * @member {string} core.protocol.fileTransfer.share.Upload~_filename
	 */
	private _filename:string = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.fs.FileBlockReaderInterface} core.protocol.fileTransfer.share.Uploader~_fileReader
	 */
	private _fileReader:FileBlockReaderInterface = null;

	/**
	 * Stores the number of bytes of the requested file.
	 *
	 * @member {number} core.protocol.fileTransfer.share.Upload~_filesize
	 */
	private _filesize:number = 0;

	/**
	 * Stores the negotiated key for decrypting incoming messages
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Upload~_incomingKey
	 */
	private _incomingKey:Buffer = null;

	/**
	 * The feeding nodes block provided in the underlying SHARE_REQUEST message.
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Upload~_initialFeedingNodesBlockOfDownloader
	 */
	private _initialFeedingNodesBlockOfDownloader:Buffer = null;

	/**
	 * Flag indicating whether the upload process is still active / valid, or has been killed.
	 * Also used to prevent killing the same upload multiple times.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.Upload~_killed
	 */
	private _killed:boolean = false;

	/**
	 * This flag indicates whether the upload has been manually aborted. In many cases, the real aborting process can only
	 * be fulfilled when something has happened – a message has rolled in, or an event has triggered, so this is used to
	 * check if to abort the process or not at some point.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.Upload~_manuallyAborted
	 */
	private _manuallyAborted:boolean = false;

	/**
	 * Stores the negotiated key for encrypting outgoing messages
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Upload~_outgoingKey
	 */
	private _outgoingKey:Buffer = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableBlockRequestFactory
	 */
	private _readableBlockRequestFactory:ReadableBlockRequestMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableEncryptedShareFactory
	 */
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_readableShareAbortFactory
	 */
	private _readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface = null;

	/**
	 * Stores the transfer identifier of the upload's underlying SHARE_REQUEST message. Used for SHARE_RATIFY message.
	 *
	 * @member {string} core.protocol.fileTransfer.share.Upload~_requestTransferIdentifier
	 */
	private _requestTransferIdentifier:string = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ShareMessengerInterface} core.protocol.fileTransfer.share.Upload~_shareMessenger
	 */
	private _shareMessenger:ShareMessengerInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Upload~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableBlockFactory
	 */
	private _writableBlockFactory:WritableBlockMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableEncryptedShareFactory
	 */
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableShareAbortFactory
	 */
	private _writableShareAbortFactory:WritableShareAbortMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface} core.protocol.fileTransfer.share.Upload~_writableShareRatifyFactory
	 */
	private _writableShareRatifyFactory:WritableShareRatifyMessageFactoryInterface = null;

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

	/**
	 * Handles a response callback from the share messenger.
	 * If the messenger timed out (thus there is no response), the upload process is killed.
	 * If there is a message, it is decrpyted and deformatted. If it's a SHARE_ABORT message, the upload is killed and cleaned up.
	 * If it is a BLOCK_REQUEST, it is checked whether the requested first byte of the block marks the end of the file. If so,
	 * the whole download/upload process is complete and the upload can be cleaned up. The 'complete' event is emitted.
	 * Otherwise the appropriate byte block is read from the file and sent within a BLOCK message.
	 *
	 * If the upload process is not yet done, it is checked for manual abortion. If the process has been aborted,
	 * the upload is killed and a last SHARE_ABORT message is sent to the downloader.
	 *
	 * On any problems decrypting or deformatting the message, or if a prohibited message type is used, the upload
	 * process is killed and the last circuit of the message torn down.
	 *
	 * @method core.protocol.fileTransfer.share.Upload~_handleMessengerResponse
	 *
	 * @param {Error} err Optional error received from the share messenger's response callback.
	 * @param {Buffer} responsePayload Optional message payload received from the sahre messenger's response callback.
	 */
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

	/**
	 * Cleans up the upload process (e.g. file reader, setting flags, feeding nodes block maintainer) and sends an optional
	 * SHARE_ABORT message to the downloader.
	 * Removes all listeners on the status events and at last emits the 'killed' event with the provided reason.
	 *
	 * This is mostly a copy from {@link core.protocol.fileTransfer.share
	 *
	 * @method core.protocol.fileTransfer.share.Uploader~_kill
	 *
	 * @param {boolean} sendLastAbortMessage If true, a last SHARE_ABORT message is sent to the downloader.
	 * @param {string} message The reason for the killing. See {@link core.protocol.fileTransfer.share.UploadInterface} for detailed information on the different reason types.
	 * @param {string} lastMessageIdentifier Optional. The transfer identifier for a last SHARE_ABORT message. This must be specified if `sendLastAbortMessage` is true.
	 * @param {Buffer} lastMessageNodesToFeedBlock Optional. The nodes to feed block in its byte buffer representation. This must be specified if `sendLastAbortMessage` is true.
	 */
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

	/**
	 * This method checks if the client has at least one circuit to write a feeding request through. If yes, the callback is
	 * IMMEDIATELY fired (not async!!). If not, a listener is set to wait for at least one circuit, before firing the callback.
	 * If it must be waited and in the meantime the upload process has been manually aborted, the callback is fired with
	 * an error as argument, indicating to kill the upload process.
	 *
	 * Note: This method is an exact copy from {@link core.protocol.fileTransfer.share.Download}
	 *
	 * @method core.protocol.fileTransfer.share.Upload~_prepareToImmediateShare
	 *
	 * @param {Function} callback
	 */
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

	/**
	 * Reads a byte block from the file from the requested position, wraps it within a BLOCK message, encrypts it
	 * and pipes it to the share messenger, waiting for an acknowledging BLOCK_REQUEST message.
	 *
	 * If anything goes wrong, or the upload process has been manually aborted while waiting for encryption / hydra circuits,
	 * the upload process is killed and a last SHARE_ABORT message is sent to the downloader.
	 *
	 * @method core.protocol.fileTransfer.share.Uploader~_readBlockAndSendByRequest
	 *
	 * @param {core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface} blockRequest The BLOCK_REQUEST message to handle.
	 */
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

	/**
	 * The first action of an upload: Sending a SHARE_RATIFY message.
	 * The Diffie-Hellman secret is generated, the keys derived and the uploader's public key wrapped within a SHARE_RATIFY message,
	 * already encrypting filename and filesize as an additional small authenticity check.
	 *
	 * As always, if anything goes wrong: Kill the upload process.
	 *
	 * @method core.protocol.fileTransfer.share.Upload~_sendShareRatify
	 */
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