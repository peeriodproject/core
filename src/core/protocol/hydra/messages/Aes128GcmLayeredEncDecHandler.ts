import LayeredEncDecHandlerInterface = require('./interfaces/LayeredEncDecHandlerInterface');
import HydraNode = require('../interfaces/HydraNode');
import Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');
import Aes128GcmWritableMessageFactory = require('./Aes128GcmWritableMessageFactory');

/**
 * Layered encryption/decryption handler using AES-128-GCM
 *
 * @class core.protocol.hydra.Aes128GcmLayeredEncDecHandler
 * @implements core.protocol.hydra.LayeredEncDecHandlerInterface
 *
 * @param {core.protocol.hydra.HydraNode} initialNode Optional. Node which gets added to the node list at once.
 */
class Aes128GcmLayeredEncDecHandler implements LayeredEncDecHandlerInterface {

	/**
	 * Ordered list which stores the nodes used for layered encryption / decryption.
	 *
	 * @member {Array<core.protocol.hydra.HydraNode>} core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_nodes
	 */
	private _nodes:Array<HydraNode> = [];

	/**
	 * Factory for protocol compliant AES 128 GCM encryption
	 *
	 * @member {core.protocol.hydra.Aes128GcmWritableMessageFactory} core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_encryptFactory
	 */
	private _encryptFactory:Aes128GcmWritableMessageFactory


	public constructor (initialNode?:HydraNode) {
		if (initialNode) {
			this.addNode(initialNode);
		}

		this._encryptFactory = new Aes128GcmWritableMessageFactory();
	}

	public addNode (node:HydraNode):void {
		if (!(node.incomingKey && node.outgoingKey)) {
			throw new Error('Aes128GcmLayeredEncDecHandler: Outgoing and incoming symmetric key must be specified');
		}

		this._nodes.push(node);
	}

	public decrypt (payload:Buffer, callback:(err:Error, decryptedPayload:Buffer) => any):void {
		if (!this._nodes.length) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for decryption'), null);
		}
		else {
			this._iterativeDecrypt(0, payload, callback);
		}
	}

	public encrypt (payload:Buffer, earlyExit:HydraNode, callback:(err:Error, encryptedPayload:Buffer) => any):void {
		if (!this._nodes.length) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for encryption'), null);
		}
		else {
			var startAt:number = this._nodes.length - 1;

			if (earlyExit) {
				var found:boolean = false;

				for (var i = 0; i < this._nodes.length; i++) {
					if (this._compareNodes(this._nodes[i], earlyExit)) {
						startAt = i;
						found = true;
						break;
					}
				}

				if (!found) {
					callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, no early exit node found.'), null);
					return;
				}
			}

			this._iterativeEncrypt(startAt, true, payload, callback);
		}
	}

	/**
	 * Returns the ordered list of nodes used for layered encryption / decryption.
	 *
	 * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler#getNodes
	 *
	 * @returns {Array<core.protocol.hydra.HydraNode>}
	 */
	public getNodes ():Array<HydraNode> {
		return this._nodes;
	}

	/**
	 * Compares two hydra nodes by their outgoing symmetric keys.
	 *
	 * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_compareNodes
	 *
	 * @param {core.protocol.hydra.HydraNode} a
	 * @param {core.protocol.hydra.HydraNode} b
	 * @returns {boolean} `true` if the keys are identical, `false` otherwise
	 */
	private _compareNodes (a:HydraNode, b:HydraNode) {
		var c:Buffer = a.outgoingKey;
		var d:Buffer = b.outgoingKey;

		if (c.length !== d.length) {
			return false;
		}

		var ret:boolean = true;

		for (var i = 0; i < c.length; i++) {
			if (c[i] !== d[i]) {
				ret = false;
				break;
			}
		}

		return ret;
	}

	/**
	 * Iteratively decrypts a message in the 'peeling off layer by layer' fashion.
	 *
	 * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_iterativeDecrypt
	 *
	 * @param {number} index Index of node in list to decrypt with
	 * @param {Buffer} payload Payload to decrypt
	 * @param {Function} callback
	 */
	private _iterativeDecrypt (index:number, payload:Buffer, callback:(err:Error, decryptedPayload:Buffer) => any):void {

		if (index === this._nodes.length) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, could not completely decrypt.'), null);
		}
		else {
			var calledBack:boolean = false;
			var msg:Aes128GcmReadableDecryptedMessage = null;

			try {
				msg = new Aes128GcmReadableDecryptedMessage(payload, this._nodes[index].incomingKey);
			}
			catch (e) {
				calledBack = true;
				callback(e, null);
			}

			if (!calledBack) {
				if (msg.isReceiver()) {
					callback(null, msg.getPayload());
				}
				else {
					setImmediate(() => {
						this._iterativeDecrypt(++index, msg.getPayload(), callback);
					});
				}
			}
		}
	}

	/**
	 * Iteratively encrypts a message layer by layer (up to finsish or early exit node)
	 *
	 * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_iterativeEncrypt
	 *
	 * @param {number} index Index of node in list to encrypt with.
	 * @param {boolean} isReceiver Indicates whether the message should be encrypted as a 'receiver' message
	 * @param {Buffer} payload Payload to encrypt
	 * @param {Function} callback
	 */
	private _iterativeEncrypt (index:number, isReceiver:boolean, payload:Buffer, callback:(err:Error, encryptedPayload:Buffer) => any):void {

		this._encryptFactory.encryptMessage(this._nodes[index].outgoingKey, isReceiver, payload, (err:Error, encryptedMsg:Buffer) => {
			if (err) {
				callback(err, null);
			}
			else {
				if (index === 0) {
					callback(null, encryptedMsg);
				}
				else {
					setImmediate(() => {
						this._iterativeEncrypt(--index, false, encryptedMsg, callback);
					});
				}
			}
		});
	}
}

export = Aes128GcmLayeredEncDecHandler;