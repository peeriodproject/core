/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import HydraNode = require('./HydraNode');
import LayeredEncDecHandlerInterface = require('../messages/interfaces/LayeredEncDecHandlerInterface');

/**
 * The Hydra Message Center handles all incoming messages, transforms and distributes them and is responsible
 * for sending out messages.
 *
 * @interface
 * @class core.protocol.hydra.HydraMessageCenterInterface
 */
interface HydraMessageCenterInterface extends NodeJS.EventEmitter {

	forceCircuitMessageThrough (payload:Buffer, from:HydraNode):void;

	/**
	 * Sends an ADDITIVE_SHARING message.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#sendAdditiveSharingMessage
	 *
	 * @param {core.protocol.hydra.HydraNode} to The node to send the message to.
	 * @param {string} targetIp The IP address the receiver node should relay the payload to.
	 * @param {number} targetPort The port the receiver node should relay the payload to.
	 * @param {string} uuid The UUID of the additive sharing scheme.
	 * @param {Buffer} additivePayload The additive payload.
	 */
	sendAdditiveSharingMessage (to:HydraNode, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void;

	/**
	 * Sends a CREATE_CELL_ADDITIVE message 'as initiator', meaning a circuit extension is intended with the provided node.
	 * The node the message is sent to will become a circuit node.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#sendCreateCellAdditiveMessageAsInitiator
	 *
	 * @param {core.protocol.hydra.HydraNode} to The node to send the message to.
	 * @param {string} circuitId The intended circuit id.
	 * @param {string} uuid The UUID of the additive sharing scheme.
	 * @param {Buffer} additivePayload The additive payload.
	 */
	sendCreateCellAdditiveMessageAsInitiator (to:HydraNode, circuitId:string, uuid:string, additivePayload:Buffer):void;

	/**
	 * Sends a ENCRYPTED_SPITOUT message to the first node of a layered encryption/decryption handler.
	 * The payload of the message is a RELAY_CREATE_CELL message (pseudomessage of ADDITIVE_SHARING)
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#spitoutRelayCreateCell
	 *
	 * @param {core.protocol.hydra.LayeredEncDecHandler} encDecHandler The layered ecnryption/decryption handler of the circuit.
	 * @param {string} targetIp The IP address the receiver node should relay the payload to.
	 * @param {number} targetPort The port the receiver node should relay the payload to.
	 * @param {string} uuid The UUID of the additive sharing scheme.
	 * @param {Buffer} additivePayload The additive payload.
	 */
	spitoutRelayCreateCellMessage (encDecHandler:LayeredEncDecHandlerInterface, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer, circuitId:string):void;
}

export = HydraMessageCenterInterface;