import events = require('events');
import crypto = require('crypto');

import BroadcastManagerInterface = require('./interfaces/BroadcastManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import BroadcastReadableMessageFactoryInterface = require('./messages/interfaces/BroadcastReadableMessageFactoryInterface');
import BroadcastReadableMessageInterface = require('./messages/interfaces/BroadcastReadableMessageInterface');
import BroadcastWritableMessageFactoryInterface = require('./messages/interfaces/BroadcastWritableMessageFactoryInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');

/**
 * BroadcastManagerInterface implementation.
 *
 * @class core.protocol.broadcast.BroadcastManager
 * @extends events.EventEmitter
 * @implements BroadcastManagerInterface
 *
 * @param {core.config.ConfigInterface} topologyConfig Configuration for alpha and bit length.
 * @param {core.config.ConfigInterface} protocolConfig Configuration for broadcast
 * @param {core.topology.MyNodeInterface} myNode My node instance.
 * @param {core.protocol.ProtocolConnectionManagerInterface} protocolConnectionManager Working protocol connection manager instance.
 * @param {core.protocol.ProxyManagerInterface} proxyManager Working proxy manager instance to listen on the 'message' event.
 * @param {core.topology.RoutingTableInterface} routingTable Routing table.
 * @param {core.protocol.broadcast.BroadcastReadableMessageFactoryInterface} readableBroadcastMessageFactory Factory for reading broadcast messages.
 * @param {core.protocol.broadcast.BroadcastWritableMessageFactoryInterface} writableBroadcastMessageFactory Factory for writing broadcast messages.
 */
class BroadcastManager extends events.EventEmitter implements BroadcastManagerInterface {

	/**
	 * The number of nodes to choose from each bucket when broadcasting.
	 *
	 * @member {number} core.protocol.broadcast.BroadcastManager~_alpha
	 */
	private _alpha:number = 0;

	/**
	 * Number of milliseconds a broadcast is valid, i.e. will be propagated on.
	 *
	 * @member {number} core.protocol.broadcast.BroadcastManager~_broadcastLifetimeInMs
	 */
	private _broadcastLifetimeInMs:number = 0;

	/**
	 * Stores the IDs of broadcasts already received (and thus need not be sent on)
	 *
	 * @member {Array<string>} core.protocol.broadcast.BroadcastManager~_knownBroadcastIds
	 */
	private _knownBroadcastIds:Array<string> = [];

	/**
	 * My node.
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.broadcast.BroadcastManager~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * The total number of buckets in the routing table.
	 *
	 * @member {number} core.protocol.broadcast.BroadcastManager~_numberOfBuckets
	 */
	private _numberOfBuckets:number = 0;

	/**
	 * Protocol connection manager instance.
	 *
	 * @member {core.protocol.ProtocolConnectionManagerInterface} core.protocol.broadcast.BroadcastManager~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * Proxy manager instance.
	 *
	 * @member {core.protocol.ProxyManagerInterface} core.protocol.broadcast.BroadcastManager~_proxyManager
	 */
	private _proxyManager:ProxyManagerInterface = null;

	/**
	 * Factory for reading broadcast messages.
	 *
	 * @member {core.protocol.broadcast.BroadcastReadableMessageFactoryInterface} core.protocol.broadcast.BroadcastManager~_readableBroadcastMessageFactory
	 */
	private _readableBroadcastMessageFactory:BroadcastReadableMessageFactoryInterface = null;

	/**
	 * Routing table instance.
	 *
	 * @member {core.topology.RoutingTableInterface} core.protocol.broadcast.BroadcastManager~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	/**
	 * Factory for writing broadcast messages.
	 *
	 * @member {core.protocol.broadcast.BroadcastWritableMessageFactoryInterface} core.protocol.broadcast.BroadcastManager~_writableBroadcastMessageFactory
	 */
	private _writableBroadcastMessageFactory:BroadcastWritableMessageFactoryInterface = null;

	public constructor (topologyConfig:ConfigInterface, protocolConfig:ConfigInterface, myNode:MyNodeInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface, routingTable:RoutingTableInterface, readableBroadcastMessageFactory:BroadcastReadableMessageFactoryInterface, writableBroadcastMessageFactory:BroadcastWritableMessageFactoryInterface) {
		super();

		this._numberOfBuckets = topologyConfig.get('topology.bitLength');
		this._alpha = topologyConfig.get('topology.alpha');
		this._myNode = myNode;
		this._broadcastLifetimeInMs = protocolConfig.get('protocol.broadcast.broadcastLifetimeInSeconds');
		this._proxyManager = proxyManager;
		this._protocolConnectionManager = protocolConnectionManager;
		this._routingTable = routingTable;
		this._readableBroadcastMessageFactory = readableBroadcastMessageFactory;
		this._writableBroadcastMessageFactory = writableBroadcastMessageFactory;

		this._proxyManager.on('message', (message:ReadableMessageInterface) => {
			if (message.getMessageType() === 'BROADCAST') {
				this._onBroadcastMessage(message);
			}
		});
	}

	public initBroadcast (payload:Buffer):void {
		var broadcastId:string = crypto.pseudoRandomBytes(8).toString('hex');
		var broadcastMsg:Buffer = this._writableBroadcastMessageFactory.constructPayload(broadcastId, payload);

		this._knownBroadcastIds.push(broadcastId);

		global.setTimeout(() => {
			this._removeFromKnownBroadcasts(broadcastId);
		}, this._broadcastLifetimeInMs);

		this._propagateMessageThroughBuckets(broadcastMsg, this._numberOfBuckets - 1);
	}

	/**
	 * Function that gets called when a new broadcast message comes in.
	 * See {@link core.protocol.broadcast.BroadcastManagerInterface} for detailed information on the decision on proceedings.
	 *
	 * @method core.protocol.broadcast.BroadcastManager~_onBroadcastMessage
	 *
	 * @param {core.protocol.messages.ReadableMessageInterface} msg The received message with the BROADCAST message as payload.
	 */
	private _onBroadcastMessage (msg:ReadableMessageInterface):void {
		var message:BroadcastReadableMessageInterface = this._readableBroadcastMessageFactory.create(msg.getPayload());

		if (message) {
			var timeElapsed:number = Date.now() - message.getTimestamp();
			var broadcastId:string = message.getBroadcastId();

			if (timeElapsed < this._broadcastLifetimeInMs && this._knownBroadcastIds.indexOf(broadcastId) > -1) {

				this.emit('receivedBroadcast', message.getPayload());

				var differsInBit:number = msg.getSender().getId().differsInHighestBit(this._myNode.getId());

				this._knownBroadcastIds.push(broadcastId);

				global.setTimeout(() => {
					this._removeFromKnownBroadcasts(broadcastId);
				}, this._broadcastLifetimeInMs - timeElapsed);

				this._propagateMessageThroughBuckets(msg.getPayload(), differsInBit - 1);
			}

		}
	}

	/**
	 * Sends a BROADCAST message to alpha random nodes from each bucket with an index less or equal than the index provided.
	 *
	 * @method core.protocol.broadcast.BroadcastManager~_propagateMessageThroughBuckets
	 *
	 * @param {Buffer} message The payload of the whole BROADCAST message
	 * @param {number} bucketStart The bucket index to start decrementing from.
	 */
	private _propagateMessageThroughBuckets (message:Buffer, bucketStart:number):void {
		for (var i = bucketStart; i >= 0; i--) {
			this._routingTable.getRandomContactNodesFromBucket(i, this._alpha, (err:Error, contactNodes:ContactNodeListInterface) => {
				if (!err && contactNodes.length) {
					this._sendMessageToNodes(message, contactNodes);
				}
			});
		}
	}

	/**
	 * Removes the given broadcast ID from the know broadcast list (if present)
	 *
	 * @method core.protocol.broadcast.BroadcastManager~_removeFromKnownBroadcasts
	 *
	 * @param {string} broadcastId The broadcast ID to remove.
	 */
	private _removeFromKnownBroadcasts (broadcastId:string):void {
		var index:number = this._knownBroadcastIds.indexOf(broadcastId);
		if (index > -1) {
			this._knownBroadcastIds.splice(index, 1);
		}
	}

	/**
	 * Sends a BROADCAST message to the provided nodes.
	 *
	 * @method core.protocol.broadcast.BroadcastManager~_sendMessageToNodes
	 *
	 * @param {Buffer} message The payload of the whole BROADCAST message to send
	 * @param {core.topology.ContactNodeListInterface} nodes The nodes to send the message to.
	 */
	private _sendMessageToNodes (message:Buffer, nodes:ContactNodeListInterface):void {
		for (var i = 0, l = nodes.length; i < l; i++) {
			this._protocolConnectionManager.writeMessageTo(nodes[i], 'BROADCAST', message);
		}
	}

}

export = BroadcastManager;