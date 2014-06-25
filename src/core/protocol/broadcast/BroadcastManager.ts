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

class BroadcastManager extends events.EventEmitter implements BroadcastManagerInterface {

	private _numberOfBuckets:number = 0;
	private _alpha:number = 0;
	private _broadcastLifetimeInMs = 0;
	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _readableBroadcastMessageFactory:BroadcastReadableMessageFactoryInterface = null;
	private _writableBroadcastMessageFactory:BroadcastWritableMessageFactoryInterface = null;
	private _myNode:MyNodeInterface = null;

	private _knownBroadcastIds:Array<string> = [];

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

	private _onBroadcastMessage(msg:ReadableMessageInterface):void {
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

	private _removeFromKnownBroadcasts (broadcastId:string):void {
		var index:number = this._knownBroadcastIds.indexOf(broadcastId);
		if (index > -1) {
			this._knownBroadcastIds.splice(index, 1);
		}
	}

	private _propagateMessageThroughBuckets(message:Buffer, bucketStart:number):void {
		for (var i=bucketStart; i>=0; i--) {
			this._routingTable.getRandomContactNodesFromBucket(i, this._alpha, (err:Error, contactNodes:ContactNodeListInterface) => {
				if (!err && contactNodes.length) {
					this._sendMessageToNodes(message, contactNodes);
				}
			});
		}
	}

	private _sendMessageToNodes(message:Buffer, nodes:ContactNodeListInterface):void {
		for (var i=0, l=nodes.length; i<l; i++) {
			this._protocolConnectionManager.writeMessageTo(nodes[i], 'BROADCAST', message);
		}
	}



}

export = BroadcastManager;