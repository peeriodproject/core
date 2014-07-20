/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface FileBlockReaderInterface {

	abort (callback:Function):void;

	prepareToRead (callback:(err:Error) => any):void;

	readBlock (fromPosition:number, callback:(err:Error, readBytes:Buffer) => any):void;
}

export = FileBlockReaderInterface;