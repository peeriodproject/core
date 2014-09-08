/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The Download class puts all pieces together by sending a SHARE_REQUEST message to the node expected to have the
 * desired file. If the other end answers with a SHARE_RATIFY message, symmetric keys are derived and the downloader
 * issues one BLOCK_REQUEST message after the other, always waiting for the appropriate BLOCK message.
 * If something goes wrong, everything is cleared up and the download process is killed. When manually aborting the download
 * process, after the cleanup a SHARE_ABORT message is sent to the other side indicating that no bytes have to be sent any more.
 * SHARE_ABORT messages are only sent if there has been no error and symmetric keys have been negotiated.
 *
 * Following events are emitted:
 *
 * - 'requestingFile': Indicates that a SHARE_REQUEST message is being prepared for sending.
 * - 'startingTransfer': This is emitted as soon as the symmetric encryption keys have been correctly negotiated
 * - 'abort': This event is fired as soon as the download process has been aborted manually. This event is followed by a 'killed'
 * event as soon as everything has been cleared up and a potential SHARE_ABORT message has been issued. This may not be immediately.
 * - 'writtenBytes': Emits the number of bytes that have been successfully written to the file as argument
 * - 'completed': Indicates that the download process has successfully finished and the hashes of the files match. This is followed
 * by a 'killed' event cleaning up everything.
 * - 'killed': This event is fired as soon as the download process has ended and cleared up. After that the download is no longer usable.
 * The event gets emitted with a message as argument. Possible messages are:
 *
 * 'File cannot be written.': The file descriptor could not be opened.
 * 'Manually aborted.': Killed after manual abortion.
 * 'Completed.': Killed after succcessful file transfer.
 * 'Encryption error.': A message could not be encrypted.
 * 'Decryption error.': A message could not be correctly decrypted.
 * 'Malformed (...) message.': The received bytes are incorrect for the expected message.
 * 'Prohibited message type.': The other end sent a message it was not supposed to send.
 * 'Uploader aborted transfer.': The other end sent a SHARE_ABORT message.
 * 'File properties do not match in abort message.': A SHARE_ABORT message was received that was correctly encrypted but
 * sported the wrong filename / hash / size.
 * 'Filename and size do not match requested file.': A SHARE_RATIFY message was received with an encrypted part that does not
 * match the expected filename and filesize.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.DownloadInterface
 */
interface DownloadInterface extends NodeJS.EventEmitter {

	/**
	 * Kicks off the download process.
	 *
	 * @method core.protocol.fileTransfer.share.DownloadInterface#kickOff
	 */
	kickOff ():void;

	/**
	 * Aborts the download process at the soonest possible moment.
	 * This may no be immediately. Instantly emits an 'abort' event, and a 'killed' event
	 * with a message as argument as soon as everything has been cleared up and the potential SHARE_ABORT message
	 * has been sent.
	 *
	 * @method core.protocol.fileTransfer.share.DownloadInterface#manuallyAbort
	 */
	manuallyAbort ():void;
}

export = DownloadInterface;