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

/**
 * DownloadInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.Download
 * @interface core.protocol.fileTransfer.share.DownloadInterface
 *
 * @param {string} filename The name of the file to request
 * @param {number} expectedSize Expected number of bytes of the file to request
 * @param {string} expectedHash Hexadecimal string representation of the SHA-1 hash of the file to request
 * @param {Buffer} initialFeedingNodesBlockBufferOfUpload The feeding nodes block that came with the result of a query, indicating how the uploader can be reached.
 * @param {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} feedingNodesBlockMaintainer Fresh feeding nodes block maintainer instance.
 * @param {core.protocol.fileTransfer.share.FileBlockWriterFactoryInterface} fileBlockWriterFactory Factory for creating file block writers.
 * @param {core.protocol.fileTransfer.share.ShareMessengerInterface} shareMessenger Fresh share messenger instance.
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter Working transfer message center instance.
 * @param {core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface} writableShareRequestFactory
 * @param {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} writableEncryptedShareFactory
 * @param {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} readableEncryptedShareFactory
 * @param {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} readableShareAbortFactory
 * @param {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} writableShareAbortFactory
 * @param {core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface} readableBlockFactory
 * @param {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface} readableShareRatifyFactory
 * @param {core.protocol.hydra.ReadableDecryptedMessageFactory} decrypter Factory for decrypting messages (e.g. AES-128-GCM factory)
 * @param {core.protocol.hydra.WritableEncryptedMessageFactory} encrypter Factory for encrypting messages (e.g. AES-128-GCM factory)
 * @param {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface} writableBlockRequestFactory
 */
class Download extends events.EventEmitter implements DownloadInterface {

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_decrypter
	 */
	private _decrypter:ReadableDecryptedMessageFactoryInterface = null;

	/**
	 * Stores the Diffie-Hellman key exchange object used for the key negotiation.
	 *
	 * @member {crypto.DiffieHellman} core.protocol.fileTransfer.share.Download~_diffieHellman
	 */
	private _diffieHellman:crypto.DiffieHellman = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_encrypter
	 */
	private _encrypter:WritableEncryptedMessageFactoryInterface = null;

	/**
	 * Stores the expected SHA-1 hash of the file to request.
	 *
	 * @member {string} core.protocol.fileTransfer.share.Download~_expectedHash
	 */
	private _expectedHash:string = null;

	/**
	 * Stores the expected number of bytes of the file to request.
	 *
	 * @member {number} core.protocol.fileTransfer.share.Download~_expectedSize
	 */
	private _expectedSize:number = 0;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.FeedingNodesBlockMaintainerInterface} core.protocol.fileTransfer.share.Download~_feedingNodesBlockMaintainerInterface
	 */
	private _feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface = null;

	/**
	 * Constructed with the factory in constructor, with the filename, expected size and expected hash.
	 *
	 * @member {core.protocol.fileTransfer.share.FileBlockWriterInterface} core.protocol.fileTransfer.share.Download~_fileBlockWriter
	 */
	private _fileBlockWriter:FileBlockWriterInterface = null;

	/**
	 * Stores the name of the file to request.
	 *
	 * @member {string} core.protocol.fileTransfer.share.Download~_filename
	 */
	private _filename:string = null;

	/**
	 * Stores the negotiated key for decrypting incoming messages
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Download~_incomingKey
	 */
	private _incomingKey:Buffer = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Download~_initialFeedingNodesBlockBufferOfUploader
	 */
	private _initialFeedingNodesBlockBufferOfUploader:Buffer = null;

	/**
	 * Flag indicating whether the download process is still active / can be used, or has been killed.
	 * Also used to prevent killing the same download multiple times.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.Download~_killed
	 */
	private _killed:boolean = false;

	/**
	 * This flag indicates whether the download has been manually aborted. In many cases, the real aborting process can only
	 * be fulfilled when something has happened – a message has rolled in, or an event has triggered, so this is used to
	 * check if to abort the process or not at some point.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.Download~_manuallyAborted
	 */
	private _manuallyAborted:boolean = false;

	/**
	 * Stores the negotiated key for encrypting outgoing messages
	 *
	 * @member {Buffer} core.protocol.fileTransfer.share.Download~_outgoingKey
	 */
	private _outgoingKey:Buffer = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableBlockFactory
	 */
	private _readableBlockFactory:ReadableBlockMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableEncryptedShareFactory
	 */
	private _readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableShareAbortFactory
	 */
	private _readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_readableShareRatifyFactory
	 */
	private _readableShareRatifyFactory:ReadableShareRatifyMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.ShareMessengerInterface} core.protocol.fileTransfer.share.Download~_shareMessenger
	 */
	private _shareMessenger:ShareMessengerInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.Download~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableBlockRequestFactory
	 */
	private _writableBlockRequestFactory:WritableBlockRequestMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableEncryptedShareFactory
	 */
	private _writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableShareAbortFactory
	 */
	private _writableShareAbortFactory:WritableShareAbortMessageFactoryInterface = null;

	/**
	 * Provided in constructor. See above.
	 *
	 * @member {core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface} core.protocol.fileTransfer.share.Download~_writableShareRequestFactory
	 */
	private _writableShareRequestFactory:WritableShareRequestMessageFactoryInterface = null;

	public constructor (filename:string, expectedSize:number, expectedHash:string, initialFeedingNodesBlockBufferOfUploader:Buffer,
		feedingNodesBlockMaintainer:FeedingNodesBlockMaintainerInterface, fileBlockWriterFactory:FileBlockWriterFactoryInterface,
		shareMessenger:ShareMessengerInterface, transferMessageCenter:TransferMessageCenterInterface, writableShareRequestFactory:WritableShareRequestMessageFactoryInterface,
		writableEncryptedShareFactory:WritableEncryptedShareMessageFactoryInterface, readableEncryptedShareFactory:ReadableEncryptedShareMessageFactoryInterface,
		readableShareAbortFactory:ReadableShareAbortMessageFactoryInterface, writableShareAbortFactory:WritableShareAbortMessageFactoryInterface,
		readableBlockFactory:ReadableBlockMessageFactoryInterface, readableShareRatifyFactory:ReadableShareRatifyMessageFactoryInterface, decrypter:ReadableDecryptedMessageFactoryInterface,
		encrypter:WritableEncryptedMessageFactoryInterface, writableBlockRequestFactory:WritableBlockRequestMessageFactoryInterface) {

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
				this._kill(false, true, false, 'File cannot be written.');
			}
			else {
				if (this._manuallyAborted) {
					this._kill(true, true, false, 'Manually aborted.');
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

	/**
	 * Handles an incoming file block message returned from the share messenger.
	 * The message is decrypted and deformatted. If it is a SHARE_ABORT message, the download is killed without sending
	 * a SHARE_ABORT message.
	 * If it is a valid BLOCK message, it is checked whether the download process has been manually aborted in the meantime.
	 * If yes, the download process is killed and a SHARE_ABORT message is sent. If not, the data block is written to the
	 * file writer and waited for a callback. Then it is checked if the file writing process has successfully finished. If yes,
	 * manual abortion is prohibited and a last BLOCK_REQUEST message as acknowledgement is written out, before emitting a 'completed'
	 * event and cleaning up the download process.
	 *
	 * If the file writing process is not yet done, it is checked for any file writing errors are manual abortion. If one of them
	 * is present, the download process is killed and a last SHARE_ABORT message is sent to the other side.
	 * Otherwise the complete amount of written bytes is emitted, before issuing a new BLOCK_REQUEST message.
	 *
	 * On any problems decrypting or deformatting the message, or when a prohibited message type is used,
	 * the download process is killed and the last circuit of the message torn down.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_handleBlockMessage
	 *
	 * @param {Buffer} payload The received payload of the ENCRYPTED_SHARE message
	 * @param {number} expectedBytePosition The expected first byte position of the next potential data block
	 */
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

									this.emit('completed');
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

	/**
	 * Handles an expected SHARE_RATIFY message, marking the end of the key negotiation process.
	 * The message is deformatted, and the diffie hellman public key extracted and the secret calculated, if successful.
	 * If the received hash and the calculated hash of the secret match, the symmetric keys and the transfer identifier for the
	 * next message are derived. Then the encrypted part of the SHARE_RATIFY message is encrypted and the filename and size
	 * compared. If everything matches, at last it is checked whether the download process has been manually aborted.
	 * If yes, the download process is killed, but now downloader and uploader share the same symmetric keys, so a SHARE_ABORT
	 * message can also be sent.
	 * Otherwise the 'startingTransfer' event is emitted before sending an initial BLOCK_REQUEST.
	 *
	 * On any deformatting, decryption, or compare errors, the download process is killed and the last circuit of the message
	 * torn down.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_handleRatifyMessage
	 *
	 * @param {Buffer} payload The payload of the received SHARE_RATIFY message
	 * @param {Buffer} prevTransferIdent The transfer identifier of the received message, used as salt for the key derivation.
	 */
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

	/**
	 * Kills the specified parts of the download process and sends an optional SHARE_ABORT message to the uploader.
	 * Removes all listeners on the status events and at last emits the 'killed' event with the provided reason.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_kill
	 *
	 * @param {boolean} abortFileWriter If true, cleans up the file writer and deletes the written file.
	 * @param {boolean} abortBlockMaintainer If true, cleans up the feeding nodes block maintainer.
	 * @param {boolean} sendLastAbortMessage If true, a last SHARE_ABORT message is sent to the uploader. This can only be done if symmetric keys have been negotiated.
	 * @param {string} message The reason for the killing. See {@link core.protocol.fileTransfer.share.DownloadInterface} for detailed information on the different reason types.
	 * @param {string} lastMessageIdentifier Optional. The transfer identifier for a last SHARE_ABORT message. This must be specified if `sendLastAbortMessage` is true.
	 * @param {Buffer} lastMessageNodesToFeedBlock Optional. The nodes to feed block in its byte buffer representation. This must be specified if `sendLastAbortMessage` is true.
	 */
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

			this.removeAllListeners('killed');
		}
	}

	/**
	 * This method checks if the client has at least one circuit to write a feeding request through. If yes, the callback is
	 * IMMEDIATELY fired (not async!!). If no, a listener is set to wait for at least one circuit, before firing the callback.
	 * If it must be waited and in the meantime the download process has been manually aborted, the callback is fired with
	 * an error as argument, indicating to kill the download process.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_prepareToImmediateShare
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
	 * Sends a BLOCK_REQUEST to the uploader.
	 * Firstly the prepare-to-share method is called. When the callback is fired and the download has been manually aborted, the
	 * process is killed and a last SHARE_ABORT message is sent.
	 * Otherwise a random transfer identifier is chosen and the block request built up (encrypting, wrapping in an ENCRYPTED_SHARE message
	 * with the identifier that the uploade expects). Then it is checked if it is the 'last' message, i.e. if it is the final acknowledgment message.
	 * If so, the last acknowledgment message is sent, and the download process is cleaned up.
	 *
	 * If it is not the last message, and the process has been manually aborted during encryption, the process is killed and a SHARE_ABORT message sent.
	 * Otherwise, the BLOCK_REQUEST message is piped to the share messenger and waited for the callback to fire. When it does so and there is
	 * an error, the process is killed, else the message is handled.
	 *
	 * On any encryption problems, the download process is killed and a SHARE_ABORT message sent. If it is the last message though, on
	 * encryption problems, the process is only killed without sending an abort message, as we are done anyway.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_sendBlockRequest
	 *
	 * @param {number} bytePosition The position of the first byte in the file to request.
	 * @param {string} transferIdentToUse The transfer identifier which the uploader expects.
	 * @param {Buffer} nodesToFeedBlock The nodes to feed.
	 * @param {boolean} isLast Indicates if this is the last acknowledgment message or not (affects error handling and cleanup).
	 */
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

	/**
	 * Sends the initial SHARE_REQUEST message. Generates the diffie hellman public key, and prepares-to-share.
	 * When prepared and in the meantime the process has been manually aborted, the download process is killed.
	 * Otherwise the message is wrapped up and piped to the share messenger, waiting for the callback to fire. When it does so,
	 * and in the meantime the process has been manually aborted, the process is killed. Else the SHARE_RATIFY message is handled.
	 *
	 * @method core.protocol.fileTransfer.share.Download~_sendShareRequest
	 */
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

}

export = Download;