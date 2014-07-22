/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * This is the opposite side of {@link core.protocol.fileTransfer.share.DownloadInterface}, providing a requested file.
 * An uplaod is created from a valid SHARE_REQUEST message. If the uploader node possesses the desired file, it answers
 * with a SHARE_RATIFY message, deriving symmetric keys, and waiting for BLOCK_REQUEST messages which can the be answered
 * with BLOCK messages.
 * As it is with the download, if something goes wrong, everything is cleared up and the upload process is killed. If the
 * uplaod is killed manually, a SHARE_ABORT message is sent to the downloader.
 * An upload is considered completed when the uploader receives a BLOCK_REQUEST message with its byte position set to the
 * full count of bytes of the file.
 *
 * Following events are emitted:
 *
 * - 'ratifyingRequest': Indicates tha a SHARE_RATIFY message is being prepared for sending.
 * - 'startingUpload': This is emitted as soon as the first BLOCK_REQUEST message rolls in
 * - 'abort': This event is fired as soon as the upload process has been aborted manually. This event is followed by a 'killed'
 * events when everything has been cleared up and a SHARE_ABORT message has been sent. This may not be immediately, as the uploader
 * may have to wait for another message from the downloader.
 * - 'uploadingBytes': The number of bytes that are currently being uploaded in a message.
 * - 'completed': Indicates the the upload process has been completed, i.e. the last bytes of the file have been acknowledged by the downloader.
 * - 'killed': This event is fired as soon as the upload process has ended and cleared up. After that the uploader is unusable.
 * The events gets emitted with a message as argument. Possible messages are:
 *
 * 'Manually aborted.': Killed after manual abortion.
 * 'Block cannot be read.': There was an error reading / compresing a file block.
 * 'File cannot be read.': The requested file cannot be read from the filesystem.
 * 'Encryption error.': A message could not be encrypted.
 * 'Decryption error.': A message could not be correctly decrypted.
 * 'Completed.': Killed after succcessful file transfer.
 * 'Malformed (...) message.': The received bytes are incorrect for the expected message.
 * 'Prohibited message type.': The other end sent a message it was not supposed to send.
 * 'Downloader aborted transfer.': The other end sent a SHARE_ABORT message.
 * 'File properties do not match in abort message.': A SHARE_ABORT message was received that was correctly encrypted but
 * sported the wrong filename / hash / size.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.UploadInterface
 */
interface UploadInterface extends NodeJS.EventEmitter {

	/**
	 * Kicks off the uploading process by generating a Diffie-Hellman half, deriving the symmetric keys from the computed
	 * secret and issuing a SHARE_RATIFY message.
	 *
	 * @method core.protocol.fileTransfer.share.UploadInterface#kickOff
	 */
	kickOff ():void;

	/**
	 * Aborts the upload process at the soones possible moment.
	 * This may not be immediately. Instantlxy emits an 'abort' event, and a 'killed' event with a
	 * message as argument as soon as everything has been cleared up the SHARE_ABORT message has been sent.
	 *
	 * @method core.protocol.fileTransfer.share.UploadInterface#manuallyAbort
	 */
	manuallyAbort ():void;
}

export = UploadInterface;