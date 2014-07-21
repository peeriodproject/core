/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface UploadInterface extends NodeJS.EventEmitter {

	kickOff ():void;

	manuallyAbort ():void;
}

export = UploadInterface;