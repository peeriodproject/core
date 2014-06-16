/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface ReadableCellCreatedMessageInterface {

	getUUID ():string;

	getSecretHash ():Buffer;

	getDHPayload ():Buffer;
}

export = ReadableCellCreatedMessageInterface;