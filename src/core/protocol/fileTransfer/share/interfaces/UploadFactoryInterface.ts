/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import UploadInterface = require('./UploadInterface');
import ReadableShareRequestMessageInterface = require('../messages/interfaces/ReadableShareRequestMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.UploadFactoryInterface
 */
interface UploadFactoryInterface {

	/**
	 * Creates an upload derived from a SHARE_REQUEST message.
	 *
	 * @method core.protocol.fileTransfer.share.UploadFactoryInterface#create
	 *
	 * @param {string} circuitIdOfRequest The identifier of the circuit through which the SHARE_REQUEST message came through
	 * @param {string} requestTransferIdentifier The transfer identifier of the SHARE_REQUEST message. Is used for the SHARE_RATIFY message.
	 * @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} shareRequest The received SHARE_REQUEST message.
	 * @param {string} filepath The full path to the file that should be shared.
	 * @param {string} filename The name of the file to share
	 * @param {number} filesize The number of bytes of the file to share
	 * @param {string} filehash The SHA-1 hash of the file to share.
	 * @returns {core.protocol.fileTransfer.share.UploadInterface}
	 */
	create (circuitIdOfRequest:string, requestTransferIdentifier:string, shareRequest:ReadableShareRequestMessageInterface, filepath:string, filename:string, filesize:number, filehash:string):UploadInterface;
}

export = UploadFactoryInterface;
