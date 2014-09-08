/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('../../interfaces/HydraNode');
import HydraNodeList = require('../../interfaces/HydraNodeList');

/**
 * LayeredEncDecHandlerInterface takes a number of nodes (in the correct order) and handles
 * layered encryption and decryption protocol compliantly.
 *
 * @interface
 * @class core.protocol.hydra.LayeredEncDecHandlerInterface
 */
interface LayeredEncDecHandlerInterface {

	/**
	 * Appends a node to the list of layers used for encryption/decryption
	 *
	 * @method core.protocol.hydra.LayeredEncDecHandlerInterface#addNode
	 *
	 * @param {core.protocol.hydra.HydraNode} node
	 */
	addNode (node:HydraNode):void;

	/**
	 * Decrypts an encrypted message by peeling off layer by layer until the decrypted message
	 * is a 'receiver' message.
	 *
	 * @method core.protocol.hydra.LayeredEncDecHandlerInterface#decrypt
	 *
	 * @param {Buffer} payload Encrypted Buffer
	 * @param {Function} callback Function that gets called with an error, if the decryption process was not successful or
	 * no 'receiver' message could be derived, and with the decryptedPayload as buffer.
	 */
	decrypt (payload:Buffer, callback: (err:Error, decryptedPayload:Buffer) => any):void;

	/**
	 * Encrypts a buffer by encrypting the message layer by layer (from end-to-start, using the node list).
	 * Optionally, an early exit node can be specified, so the message is only encrypted up to this node.
	 *
	 * @method core.protocol.hydra.LayeredEncDecHandlerInterface#encrypt
	 *
	 * @param {Buffer} payload The payload to encrypt.
	 * @param {core.protocol.hydra.HydraNode} earlyExit Optional early exit node.
	 * @param {Function} callback Function that gets called with an error, if the encryption process was not successful,
	 * and with the encryptedPayload as buffer.
	 */
	encrypt (payload:Buffer, earlyExit:HydraNode, callback: (err:Error, encryptedPayload:Buffer) => any):void;

	/**
	 * Returns the ordered list of nodes used for layered encryption / decryption.
	 *
	 * @method core.protocol.hydra.LayeredEncDecHandlerInterface#getNodes
	 *
	 * @returns {core.protocol.hydra.HydraNodeList}
	 */
	getNodes ():HydraNodeList;
}

export = LayeredEncDecHandlerInterface;