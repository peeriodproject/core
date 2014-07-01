/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

interface TransferMessageCenterInterface extends NodeJS.EventEmitter {

	wrapTransferMessage (messageType:string, transferId:string, payload:Buffer):Buffer;

}

export = TransferMessageCenterInterface;