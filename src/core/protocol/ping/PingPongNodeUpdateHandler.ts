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

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * PingPongNodeUpdateHandlerInterface implementation.
 *
 * @class core.protocol.ping.PingPongNodeUpdateHandler
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.ping.PingPongNodeUpdateHandlerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.topology.MyNodeInterface} myNode
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager Running protocol connection manager
 * @oaram {core.protocol.proxy.ProxyManagerInterface} proxyManager
 * @param {core.topology.RoutingTableInterface} routingTable
 */
class PingPongNodeUpdateHandler extends events.EventEmitter implements PingPongNodeUpdateHandlerInterface {

	/**
	 * The maximum size a waiting list of a bucket can grow to until all incoming nodes for this list are simply discarded.
	 *
	 * @member {number} core.protocol.ping.PingPongNodeUpdateHandler~_maxWaitingListSize
	 */
	private _maxWaitingListSize:number = 0;

	/**
	 * My node.
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.ping.PingPongNodeUpdateHandler~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * The running protocol connection manager instance.
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.ping.PingPongNodeUpdateHandler~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * The running proxy manager instance.
	 *
	 * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.ping.PingPongNodeUpdateHandler~_proxyManager
	 */
	private _proxyManager:ProxyManagerInterface = null;

	/**
	 * Number of milliseconds a PINGed node has to respond until the PING is considered a fail.
	 *
	 * @member {number} core.protocol.ping.PingPongNodeUpdateHandler~_reactionTime
	 */
	private _reactionTime:number = 0;

	/**
	 * Routing table of the peer.
	 *
	 * @member {core.topology.RoutingTableInterface} core.protocol.ping.PingPongNodeUpdateHandler~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	/**
	 * The array holding the waiting lists for the buckets.
	 *
	 * @member {Array<core.protocol.ping.PongWaitingList} core.protocol.ping.PingPongNodeUpdateHandler~_waitingLists
	 */
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

	public getWaitingLists ():Array<PongWaitingList> {
		return this._waitingLists;
	}

	/**
	 * Adds new node information to the waiting list for the right bucket. Checks if it is the first and if so, fires off
	 * the ping.
	 * The passed `possibleNodeToCheck` can however differ later, if the waiting list isn't empty.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_addToWaitingList
	 *
	 * @param {core.topology.ContactNodeInterface} node The new node information to add to the waiting list
	 * @param {core.topology.ContactNodeInterface} possibleNodeToCheck The currently least recently seen node for the right bucket.
	 */
	private _addToWaitingList (node:ContactNodeInterface, possibleNodeToCheck:ContactNodeInterface):void {
		var waitingListNumber = this._getWaitingListNumberByNode(node);

		if (waitingListNumber > -1) {
			var existingWaitingList:PongWaitingList = this._waitingLists[waitingListNumber];
			var isFirst:boolean = !existingWaitingList || !existingWaitingList.length;

			if (!existingWaitingList) {
				this._waitingLists[waitingListNumber] = existingWaitingList = [];
			}

			if (existingWaitingList.length < this._maxWaitingListSize) {
				var slot:PongWaitingSlot = {
					newNode    : node,
					nodeToCheck: isFirst ? possibleNodeToCheck : null,
					timeout    : 0
				};
				existingWaitingList.push(slot);

				if (isFirst) {
					this._handleNextInWaitingList(waitingListNumber);
				}
			}
		}
	}



	/**
	 * Creates the timeout for a specific waitingListNumber. If it elapses, the first slot of the specified waiting list
	 * is removed and the 'old' node of the slot is replaced by the 'new' one in the routing table.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_createSlotTimeout
	 *
	 * @param {number} waitingListNumber
	 * @returns {number|NodeJS.Timer}
	 */
	private _createSlotTimeout (waitingListNumber:number):number {
		return global.setTimeout((waitingListNum:number) => {
			var slot:PongWaitingSlot = this._waitingLists[waitingListNum].splice(0, 1)[0];

			this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);

			this.emit('pingTimeout', slot.nodeToCheck);

			this._handleNextInWaitingList(waitingListNum);
		}, this._reactionTime, waitingListNumber);
	}

	/**
	 * Returns the waiting list index of the passed node. Checks it agains my node, so it is actually the bucket
	 * number the node should be stored in.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_getWaitingListNumberByNode
	 *
	 * @param {core.topology.ContactNodeInterface} node Node to check against
	 * @returns {number}
	 */
	private _getWaitingListNumberByNode (node:ContactNodeInterface) {
		return this._myNode.getId().differsInHighestBit(node.getId());
	}

	/**
	 * Takes the first entry of the waiting list with the specified index. If there is an entry, it checks whether
	 * the `nodeToCheck` is already set (this is when a slot is put into an empty list). If yes, it PINGs the same.
	 * If not, it checks the routing table again for the least recently seen node. If there is none (e.g. the new node
	 * could be added), the slot is removed and the next slot is getting checked.
	 * If there is one, it is PINGed all the same.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_handleNextInWaitingList
	 *
	 * @param {number} waitingListNumber
	 */
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
						logger.info('Bucket check', {newNodeDiffer: this._getWaitingListNumberByNode(slot.newNode), oldNodeDiffer: this._getWaitingListNumberByNode(longestNotSeenContact)});

						slot.nodeToCheck = longestNotSeenContact;
						this._pingNodeByWaitingSlot(slot, waitingListNumber);
					}
					else {
						this._waitingLists[waitingListNumber].splice(0, 1);
						this._handleNextInWaitingList(waitingListNumber);
					}
				})
			}
		}
	}

	/**
	 * Handles a PONG message. Checks if the PONGing node can be referenced to the first slot in the right waiting list.
	 * If yes, nothing is done except removing the slo (and thus discarding the information about the new node).
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_handlePong
	 *
	 * @param {core.topology.ContactNodeInterface} node The PONGing node
	 */
	private _handlePong (node:ContactNodeInterface):void {
		var waitingListNumber:number = this._getWaitingListNumberByNode(node);
		var list:PongWaitingList = this._waitingLists[waitingListNumber];

		if (list && list.length) {
			var first:PongWaitingSlot = list[0];

			if (node.getId().equals(first.nodeToCheck.getId())) {
				global.clearTimeout(first.timeout);
				list.splice(0, 1);

				this.emit('gotPonged', node);

				this._handleNextInWaitingList(waitingListNumber);
			}
		}
	}

	/**
	 * The handler for the proxy's `contactNodeInformation` event. Tries to update it in the routing table. If it is not
	 * present yet, but the bucket is full, it is added to the waiting list.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_newNodeInformation
	 *
	 * @param {core.topology.ContactNodeInterface} node The new contact node info.
	 */
	private _newNodeInformation (node:ContactNodeInterface):void {
		this._routingTable.updateContactNode(node, (err:Error, longestNotSeenContact:ContactNodeInterface) => {
			if (err && longestNotSeenContact) {
				this._addToWaitingList(node, longestNotSeenContact);
			}
		});
	}

	/**
	 * Sends a PING message to the `nodeToCheck` in a waiting slot and act accordingly. If the sending fails,
	 * the slot is immediately removed and the `nodeToCheck` replaced with the `newNode`. If not, the timeout is set.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_pingNodeByWaitingSlot
	 *
	 * @param {core.protocol.ping.PongWaitingSlot} slot
	 * @param {number} waitingListNumber
	 */
	private _pingNodeByWaitingSlot (slot:PongWaitingSlot, waitingListNumber:number):void {
		this._protocolConnectionManager.writeMessageTo(slot.nodeToCheck, 'PING', new Buffer(0), (err:Error) => {
			if (err) {
				this._waitingLists[waitingListNumber].splice(0, 1);

				this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
			}
			else {
				slot.timeout = this._createSlotTimeout(waitingListNumber);
			}
		});
	}

	/**
	 * Sends a PONG message to the specified node.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_sendPongTo
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 */
	private _sendPongTo (node:ContactNodeInterface):void {
		this._protocolConnectionManager.writeMessageTo(node, 'PONG', new Buffer(0));
	}

	/**
	 * Initially sets up the listeners on the proxy's `message` and `contactNodeInformation` event.
	 *
	 * @method core.protocol.ping.PingPongNodeUpdateHandler~_setupListeners
	 * 
	 */
	private _setupListeners ():void {
		this._proxyManager.on('message', (message:ReadableMessageInterface) => {
			var type:string = message.getMessageType();

			if (type === 'PING') {
				this._sendPongTo(message.getSender());
			}
			else if (type === 'PONG') {
				this._handlePong(message.getSender());
			}
		});

		this._proxyManager.on('contactNodeInformation', (node:ContactNodeInterface) => {
			this._newNodeInformation(node);
		});
	}

}

export = PingPongNodeUpdateHandler;