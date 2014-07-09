/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.fileTransfer.PendingQueryList
 */
interface PendingQueryList {
	[broadcastId:string]:Buffer;
}

export = PendingQueryList;