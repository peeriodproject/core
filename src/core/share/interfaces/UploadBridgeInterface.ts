/// <reference path='../../../../ts-definitions/node/node.d.ts' />

interface UploadBridgeInterface extends NodeJS.EventEmitter {

	getFileInfoByHash (fileHash:string, callback:(err:Error, fullFilePath:string, filename:string, filesize:number) => any):void;
}

export = UploadBridgeInterface;