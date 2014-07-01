/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.fileTransfer.TransferMessageCenterInterface
 * @extends NodeJS.EventEmitter
 */
interface TransferMessageCenterInterface extends NodeJS.EventEmitter {

	wrapTransferMessage (messageType:string, transferId:string, payload:Buffer):Buffer;

}

export = TransferMessageCenterInterface;