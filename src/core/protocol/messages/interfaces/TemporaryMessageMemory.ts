/// <reference path='../../../../../ts-definitions/node/node.d.ts' />´

/**
 * @interface
 * @class core.protocol.messages.TemporaryMessageMemory
 */
interface TemporaryMessageMemory {
	length:number;
	data:Array<Buffer>;
}

export = TemporaryMessageMemory;