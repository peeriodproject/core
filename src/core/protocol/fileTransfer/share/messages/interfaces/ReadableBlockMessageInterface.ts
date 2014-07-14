/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

interface ReadableBlockMessageInterface {

	getFirstBytePositionOfBlock ():number;

	getNextTransferIdentifier ():string;
}

export = ReadableBlockMessageInterface;