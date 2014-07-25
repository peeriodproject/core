/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.share.UploadBridgeInterface
 */
interface UploadBridgeInterface extends NodeJS.EventEmitter {

	getFileInfoByHash (fileHash:string, callback:(err:Error, fullFilePath:string, fileName:string, fileSize:number) => any):void;

}

export = UploadBridgeInterface;