/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import HydraNode = require('./HydraNode');
import LayeredEncDecHandlerInterface = require('../messages/interfaces/LayeredEncDecHandlerInterface');
import ReadableAdditiveSharingMessageInterface = require('../messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableCreateCellAdditiveMessageInterface = require('../messages/interfaces/ReadableCreateCellAdditiveMessageInterface');

/**
 * The Hydra Message Center handles all incoming messages, transforms and distributes them and is responsible
 * for sending out messages.
 *
 * @interface
 * @class core.protocol.hydra.HydraMessageCenterInterface
 */
interface HydraMessageCenterInterface extends NodeJS.EventEmitter {

	/**
	 * Forces a decrypted message through the pipe, i.e. creating a hydra message and letting the message center
	 * emit the appropriate message type.
	 * The emitted event will have the flag `decrypted` set to true.
	 * This is used by Cells and Circuits after they decrypted digest/spitout messages.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#forceCircuitMessageThrough
	 *
	 * @param {Buffer} The payload to use to build the right message.
	 * @param {core.protocol.hydra.HydraNode} The node the message originated from.
	 */
	forceCircuitMessageThrough (payload:Buffer, from:HydraNode):void;

	/**
	 * Returns the full buffer of an already unwrapped hydra message type.
	 * Does not prepend the indicator byte of the message type.
	 *
	 * @method core.protocol.hydra.hydraMessageCenterInterface#getFullBufferOfMessage
	 *
	 * @param {string} type The human readable representation of the message to get the full buffer from.
	 * @param {any} msg Any already unwrapped message.
	 */
	getFullBufferOfMessage (type:string, msg:any):Buffer;

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
	 * Constructs a CELL_CREATED_REJECTED messahe with the given params and sends it to the given hydra node.
	 * The hydra node SHOULD already have a socket identifier assigned and MUST have a circuit id assigned.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#sendCellCreatedRejectedMessage
	 *
	 * @param {core.protocol.hydra.HydraNode} to The node to send the message to
	 * @param {string} uuid The UUID of the additive sharing scheme assigned to this CREATE_CELL_ADDITIVE request.
	 * @param {Buffer} secretHash Optional. SHA-1 hash of the shared secret. This must only be present when accepting the request.
	 * @param {Buffer} dhPayload Optional. The other half of the DH key exchange. This must only be present when accepting the request.
	 */
	sendCellCreatedRejectedMessage (to:HydraNode, uuid:string, secretHash?:Buffer, dhPayload?:Buffer):void;

	/**
	 * Sends an ENCRYPTED_SPITOUT message to the first ndoe of a layered encryption/decryption handler.
	 * The payload will be wrapped in a FILE_TRANSFER message and is encrypted onion-style.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#spitoutFileTransferMessage
	 *
	 * @param {core.protocol.hydra.LayeredEncDecHandler} encDecHandler The layered ecnryption/decryption handler of the circuit.
	 *
	 */
	spitoutFileTransferMessage (encDecHandler:LayeredEncDecHandlerInterface, payload:Buffer):void;

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

	/**
	 * Unwraps the CREATE_CELL_ADDITIVE message from an ADDITIVE_SHARING payload.
	 * This is used by cells for example, to extract the uuid of the current additive scheme.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#unwrapAdditiveSharingPayload
	 *
	 * @param {core.protocol.hydra.ReadableAdditiveSharingMessageInterface} message
	 * @returns {core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface}
	 */
	unwrapAdditiveSharingPayload (message:ReadableAdditiveSharingMessageInterface):ReadableCreateCellAdditiveMessageInterface;

	/**
	 * Wraps a payload in a FILE_TRANSFER message.
	 *
	 * @method core.protocol.hydra.HydraMessageCenterInterface#wrapFileTransferMessage
	 *
	 * @param {Buffer} payload The payload of the intended FILE_TRANSFER message
	 * @return {Buffer}
	 */
	wrapFileTransferMessage (payload:Buffer):Buffer;
}

export = HydraMessageCenterInterface;