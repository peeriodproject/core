/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface FileBlockWriterInterface {

	abort (callback:Function):void;

	writeBlock (byteBlock:Buffer, callback:(err:Error, fullCountOfWrittenBytes?:number, isFinished?:boolean, positionOfFirstByteInNextBlock?:number) => any):void;

	prepareToWrite (callback:(err:Error) => any):void
}

export = FileBlockWriterInterface;