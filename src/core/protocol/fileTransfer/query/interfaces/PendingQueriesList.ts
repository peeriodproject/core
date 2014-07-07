/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.fileTransfer.PendingQueriesList
 */
interface PendingQueriesList {
	[broadcastId:string]:Buffer;
}

export = PendingQueriesList;