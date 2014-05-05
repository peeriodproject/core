/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.messages.ReadableMessageInterface
 */
interface ReadableMessageInterface {

	// todo move into constructor?!
	deformat ():void;

	discard ():void;

}

export = ReadableMessageInterface;