/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.messages.ReadableMessageInterface
 */
interface ReadableMessageInterface {

	deformat ():void;

	discard ():void;

}

export = ReadableMessageInterface;