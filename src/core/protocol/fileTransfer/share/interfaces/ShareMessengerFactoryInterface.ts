/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ShareMessengerInterface = require('./ShareMessengerInterface');

/**
 * @class
 * @interface core.protocol.fileTransfer.share.ShareMessengerFactoryInterface
 */
interface ShareMessengerFactoryInterface {

	/**
	 * @method core.protocol.fileTransfer.share.ShareMessengerFactoryInterface#createMessenger
	 *
	 * @returns {core.protocol.fileTransfer.share.ShareMessengerInterface}
	 */
	createMessenger ():ShareMessengerInterface;
}

export = ShareMessengerFactoryInterface;