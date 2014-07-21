/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface UploadInterface extends NodeJS.EventEmitter {

	manuallyAbort ():void;
}

export = UploadInterface;