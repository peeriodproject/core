import MiddlewareInterface = require('./interfaces/MiddlewareInterface');
import WritableFileTransferMessageFactoryInterface = require('./messages/interfaces/WritableFileTransferMessageFactoryInterface');
import CellManagerInterface = require('../hydra/interfaces/CellManagerInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import HydraMessageCenterInterface = require('../hydra/interfaces/HydraMessageCenterInterface');
import HydraNodeList = require('../hydra/interfaces/HydraNodeList');
import HydraNode = require('../hydra/interfaces/HydraNode');

class Middleware implements MiddlewareInterface {

	private _cellManager:CellManagerInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _hydraMessageCenter:HydraMessageCenterInterface = null;
	private _writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface = null;

	private _outgoingSockets:{[concatIdent:string]:string} = {};
	private _incomingSockets:{[circuitId:string]:Array<string>} = {};

	public constructor (cellManager:CellManagerInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, hydraMessageCenter:HydraMessageCenterInterface, writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface) {
		this._cellManager = cellManager;
		this._protocolConnectionManager = protocolConnectionManager;
		this._hydraMessageCenter = hydraMessageCenter;
		this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;

		this._setupListeners();
	}

	public feedNode (feedingNodes:HydraNodeList, associatedCircuitId:string, payloadToFeed:Buffer):void {
		var fed:boolean = false;

		for (var i=0, l=feedingNodes.length; i<l; i++) {
			var node:HydraNode = feedingNodes[i];
			var existingSocket:string = this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)];

			if (existingSocket) {
				this._feedSocket(existingSocket, node.feedingIdentifier, payloadToFeed);
				fed = true;
				break;
			}
		}

		if (!fed) {
			this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed);
		}
	}

	public addIncomingSocket (circuitId:string, socketIdentifier:string):void {
		var existing:Array<string> = this._incomingSockets[circuitId];

		if (existing) {
			existing.push(socketIdentifier);
		}
		else {
			this._incomingSockets[circuitId] = [socketIdentifier];
		}
	}

	public closeSocketByIdentifier (socketIdentifier:string):void {
		this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
	}

	private _obtainConnectionAndFeed(feedingNodes:HydraNodeList, associatedCircuitId:string, payloadToFeed:Buffer, usedIndices:Array<number> = []):void {
		var feedingNodesLength = feedingNodes.length;

		if (usedIndices.length !== feedingNodesLength) {

			var randIndex:number = Math.floor(Math.random() * feedingNodesLength);

			if (usedIndices.indexOf(randIndex) >= 0) {
				this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
			}
			else {
				var node:HydraNode = feedingNodes[randIndex];

				usedIndices.push(randIndex);

				this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error, identifier:string) => {
					if (!err && identifier) {
						this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)] = identifier;
						this._feedSocket(identifier, node.feedingIdentifier, payloadToFeed);
					}
					else {
						this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
					}
				});
			}
		}
	}

	private _feedSocket (socketIdentifier:string, feedingIdentifier:string, payloadToFeed:Buffer):void {
		var bufferToSend:Buffer = null;

		try {
			bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(feedingIdentifier, 'GOT_FED', payloadToFeed));
		}
		catch(e) {
		}

		if (bufferToSend) {
			this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);
		}
	}

	private _constructOutgoingKey(node:HydraNode, circuitId:string):string {
		return circuitId + '_' + node.ip + '_' + node.port + '_' + node.feedingIdentifier;
	}

	private _setupListeners ():void {
		this._cellManager.on('tornDownCell', (circuitId:string) => {
			var incomingSockets:Array<string> = this._incomingSockets[circuitId];

			if (incomingSockets && incomingSockets.length) {
				for (var i=0, l=incomingSockets.length; i<l; i++) {
					this._protocolConnectionManager.closeHydraSocket(circuitId);
				}

				delete this._incomingSockets[circuitId];
			}

			var outgoingSocketsKeys:Array<string> = Object.keys(this._outgoingSockets);

			for (var i=0, l=outgoingSocketsKeys.length; i<l; i++) {
				var key:string = outgoingSocketsKeys[i];

				if (key.indexOf(circuitId) === 0) {
					this._protocolConnectionManager.closeHydraSocket(key);

					delete this._outgoingSockets[key];
				}
			}
		});

		this._protocolConnectionManager.on('terminatedConnection', (identifier:string) => {
			// we do not care for the incoming sockets, they clean themselves up as soon as the circuit is torn down
			// we only care for the outgoing sockets

			var outgoingSocketsKeys:Array<string> = Object.keys(this._outgoingSockets);

			for (var i=0, l=outgoingSocketsKeys.length; i<l; i++) {
				var key:string = outgoingSocketsKeys[i];

				if (this._outgoingSockets[key] === identifier) {
					delete this._outgoingSockets[key];
					break;
				}
			}
		});
	}

}

export = Middleware;