import LayeredEncDecHandlerInterface = require('./interfaces/LayeredEncDecHandlerInterface');
import HydraNode = require('../interfaces/HydraNode');
import Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');
import Aes128GcmWritableMessageFactory = require('./Aes128GcmWritableMessageFactory');

class Aes128GcmLayeredEncDecHandler implements LayeredEncDecHandlerInterface {

	private _nodes:Array<HydraNode> = [];
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

	public decrypt (payload:Buffer, callback: (err:Error, decryptedPayload:Buffer) => any):void {
		if (!this._nodes.length) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for decryption'), null);
		}
		else {
			this._iterativeDecrypt(0, payload, callback);
		}
	}

	public encrypt (payload:Buffer, earlyExit:HydraNode, callback: (err:Error, encryptedPayload:Buffer) => any):void {
		if (!this._nodes.length) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for encryption'), null);
		}
		else {
			this._iterativeEncrypt(0, payload, earlyExit, callback);
		}
	}

	private _iterativeEncrypt (index:number, payload:Buffer, earlyExit:HydraNode, callback: (err:Error, encryptedPayload:Buffer) => any):void {
		var nodeSize:number = this._nodes.length - 1;
		var node:HydraNode = this._nodes[nodeSize - index];
		var isExit:boolean = earlyExit ? this._compareNodes(node, earlyExit) : (index === nodeSize);

		if (earlyExit && index === nodeSize && !isExit) {
			callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, no early exit node found.'), null);
		}
		else {
			this._encryptFactory.encryptMessage(node.outgoingKey, (index === 0), payload, (err:Error, encryptedMsg:Buffer) => {
				if (err) {
					callback(err, null);
				}
				else {
					if (isExit) {
						callback(null, encryptedMsg);
					}
					else {
						setImmediate(() => {
							this._iterativeEncrypt(++index, encryptedMsg, earlyExit, callback);
						});
					}
				}
			});
		}
	}

	private _compareNodes (a:HydraNode, b:HydraNode) {
		var c:Buffer = a.outgoingKey;
		var d:Buffer = b.outgoingKey;

		if (c.length !== d.length) {
			return false;
		}

		var ret:boolean = true;

		for (var i=0; i<c.length; i++) {
			if (c[i] !== d[i]) {
				ret = false;
				break;
			}
		}

		return ret;
	}

	private _iterativeDecrypt (index:number, payload:Buffer, callback: (err:Error, decryptedPayload:Buffer) => any):void {

		if (index === this._nodes.length - 1) {
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
}

export = Aes128GcmLayeredEncDecHandler;