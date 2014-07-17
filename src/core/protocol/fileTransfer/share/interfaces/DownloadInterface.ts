/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface DownloadInterface extends NodeJS.EventEmitter {

	kickOff ():void;

	manuallyAbort ():void;
}

export = DownloadInterface;