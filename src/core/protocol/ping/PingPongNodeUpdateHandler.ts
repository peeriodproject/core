import events = require('events');

import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');
import PingPongNodeUpdateHandlerInterface = require('./interfaces/PingPongNodeUpdateHandlerInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import PongWaitingList = require('./interfaces/PongWaitingList');
import PongWaitingSlot = require('./interfaces/PongWaitingSlot');

/**
 *
 * @class core.protocol.ping.PingPongNodeUpdateHandler
 * @implements core.protocol.ping.PingPongNodeUpdateHandlerInterface
 */
class PingPongNodeUpdateHandler extends events.EventEmitter implements PingPongNodeUpdateHandlerInterface {

	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _reactionTime:number = 0;
	private _maxWaitingListSize:number = 0;
	private _myNode:MyNodeInterface = null;

	private _waitingLists:Array<PongWaitingList> = [];

	constructor (config:ConfigInterface, myNode:MyNodeInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface, routingTable:RoutingTableInterface) {
		super();

		this._myNode = myNode;
		this._reactionTime = config.get('protocol.waitForNodeReactionInSeconds') * 1000;
		this._maxWaitingListSize = config.get('protocol.pingpong.maxWaitingListSize');
		this._protocolConnectionManager = protocolConnectionManager;
		this._proxyManager = proxyManager;
		this._routingTable = routingTable;

		this._setupListeners();
	}

	private _newNodeInformation (node:ContactNodeInterface):void {
		this._routingTable.updateContactNode(node, (err:Error, longestNotSeenContact:ContactNodeInterface) => {
			if (err && longestNotSeenContact) {
				this._addToWaitingList(node, longestNotSeenContact);
			}
		});
	}

	private _addToWaitingList (node:ContactNodeInterface, possibleNodeToCheck:ContactNodeInterface):void {
		var waitingListNumber = this._getWaitingListNumberByNode(node);

		if (waitingListNumber > -1) {
			var existingWaitingList:PongWaitingList = this._waitingLists[waitingListNumber];
			var isFirst:boolean = !existingWaitingList || !existingWaitingList.length;

			if (!existingWaitingList) {
				this._waitingLists[waitingListNumber] = existingWaitingList = [];
			}

			/**
			 * @todo stop! timeout und listener dürfen erst später gesetzt werden
			 *
			 */
			if (existingWaitingList.length < this._maxWaitingListSize) {
				var slot:PongWaitingSlot = {
					newNode: node,
					nodeToCheck: isFirst ? possibleNodeToCheck : null,
					timeout: 0
				};
				existingWaitingList.push(slot);

				if (isFirst) {
					this._handleNextInWaitingList(waitingListNumber);
				}
			}
		}
	}

	private _handleNextInWaitingList (waitingListNumber:number):void {
		var slot:PongWaitingSlot = this._waitingLists[waitingListNumber][0];
		if (slot) {
			// there is a slot. check if it already has a node to check
			if (slot.nodeToCheck) {
				this._pingNodeByWaitingSlot(slot, waitingListNumber);
			}
			else {
				this._routingTable.updateContactNode(slot.newNode, (err:Error, longestNotSeenContact:ContactNodeInterface) => {
					if (err && longestNotSeenContact) {
						slot.nodeToCheck = longestNotSeenContact;
						this._pingNodeByWaitingSlot(slot, waitingListNumber);
					}
					else {
						this._handleNextInWaitingList(waitingListNumber);
					}
				})
			}
		}
	}

	private _pingNodeByWaitingSlot (slot:PongWaitingSlot, waitingListNumber:number):void {
		this._protocolConnectionManager.writeMessageTo(slot.nodeToCheck, 'PING', new Buffer(0), (err:Error) => {
			if (err) {
				this._waitingLists[waitingListNumber].splice(0,1);
				this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
			}
			else {
				slot.timeout = this._createSlotTimeout(waitingListNumber);
				this.once(this._pongEventName(slot.nodeToCheck), this._createSlotListener(waitingListNumber));
			}
		});
	}

	private _pongEventName (node:ContactNodeInterface):string {
		return 'pong' + this._nodeToIdentifier(node);
	}

	private _createSlotTimeout(waitingListNumber:number):number {
		return setTimeout(() => {
			var slot:PongWaitingSlot = this._waitingLists[waitingListNumber].splice(0,1)[0];

			this.removeAllListeners(this._pongEventName(slot.nodeToCheck));
			this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
			this._handleNextInWaitingList(waitingListNumber);
		}, this._reactionTime);
	}

	private _createSlotListener (waitingListNumber:number):Function {
		return () => {
			var slot:PongWaitingSlot = this._waitingLists[waitingListNumber].splice(0,1)[0];

			clearTimeout(slot.timeout);
			this._handleNextInWaitingList(waitingListNumber);
		};
	}

	private _getWaitingListNumberByNode (node:ContactNodeInterface) {
		return this._myNode.getId().differsInHighestBit(node.getId());
	}

	private _setupListeners ():void {
		this._proxyManager.on('message', (message:ReadableMessageInterface) => {
			var type:string = message.getMessageType();
			if (type === 'PING') {
				this._sendPongTo(message.getSender());
			}
			else if (type === 'PONG') {
				this.emit(this._pongEventName(message.getSender()));
			}
		});

		this._proxyManager.on('contactNodeInformation', (node:ContactNodeInterface) => {
			this._newNodeInformation(node);
		});
	}

	_sendPongTo (node:ContactNodeInterface):void {
		this._protocolConnectionManager.writeMessageTo(node, 'PONG', new Buffer(0));
	}

	private _nodeToIdentifier (node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

}

export = PingPongNodeUpdateHandler;