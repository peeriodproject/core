/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import IdInterface = require('../../../topology/interfaces/IdInterface');
import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');

/**
 * @interface
 * @class core.protocol.messages.ReadableMessageInterface
 */
interface ReadableMessageInterface {

	discard ():void;

	getReceiverId ():IdInterface;

	getSender ():ContactNodeInterface;

	getMessageType ():string;

	getPayload ():Buffer;

}

export = ReadableMessageInterface;