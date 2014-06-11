/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('../../interfaces/HydraNode');

interface LayeredEncDecHandlerInterface {

	addNode (node:HydraNode):void;

	decrypt (payload:Buffer, callback: (err:Error, decryptedPayload:Buffer) => any):void;

	encrypt (payload:Buffer, earlyExit:HydraNode, callback: (err:Error, encryptedPayload:Buffer) => any):void;
}

export = LayeredEncDecHandlerInterface;