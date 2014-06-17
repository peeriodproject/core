/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import HydraNode = require('./HydraNode');
import LayeredEncDecHandlerInterface = require('../messages/interfaces/LayeredEncDecHandlerInterface');

interface HydraMessageCenterInterface extends NodeJS.EventEmitter {

	sendAdditiveSharingMessage (to:HydraNode, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void;

	sendCreateCellAdditiveMessageAsInitiator (to:HydraNode, circuitId:string, uuid:string, additivePayload:Buffer):void;

	spitoutRelayCreateCellMessage (encDecHandler:LayeredEncDecHandlerInterface, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer, circuitId:string):void;
}

export = HydraMessageCenterInterface;