/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import HydraNode = require('./HydraNode');

interface HydraMessageCenterInterface extends NodeJS.EventEmitter {

	sendAdditiveSharingMessage (to:HydraNode, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void;

}

export = HydraMessageCenterInterface;