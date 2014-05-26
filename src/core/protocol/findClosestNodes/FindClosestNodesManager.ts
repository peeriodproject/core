import events = require('events');

import FindClosestNodesManagerInterface = require('./interfaces/FindClosestNodesManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import FoundClosestNodesReadableMessageInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageInterface');
import FoundClosestNodesReadableMessageFactoryInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageFactoryInterface');
import FoundClosestNodesReadableMessageFactory = require('./messages/FoundClosestNodesReadableMessageFactory');
import FoundClosestNodesWritableMessageFactoryInterface = require('./messages/interfaces/FoundClosestNodesWritableMessageFactoryInterface');
import FoundClosestNodesWritableMessageFactory = require('./messages/FoundClosestNodesWritableMessageFactory');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import FindClosestNodesCycleInterface = require('./interfaces/FindClosestNodesCycleInterface');
import FindClosestNodesCycle = require('./FindClosestNodesCycle');

class FindClosestNodesManager extends events.EventEmitter implements FindClosestNodesManagerInterface {

	_myNode:MyNodeInterface = null;
	_protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	_proxyManager:ProxyManagerInterface = null;
	_routingTable:RoutingTableInterface = null;

	_k:number = 0;
	_alpha:number = 0;
	_cycleExpirationMillis:number = 0;
	_parallelismDelayMillis:number = 0;

	_writableMessageFactory:FoundClosestNodesWritableMessageFactoryInterface = null;
	_readableMessageFactory:FoundClosestNodesReadableMessageFactoryInterface = null;

	_pendingCycles:Array<string> = [];


	constructor (topologyConfig:ConfigInterface, protocolConfig:ConfigInterface, myNode:MyNodeInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface, routingTable:RoutingTableInterface) {

		super();

		this._k = topologyConfig.get('topology.k');
		this._alpha = topologyConfig.get('topology.alpha');
		this._cycleExpirationMillis = protocolConfig.get('protocol.findClosestNodes.cycleExpirationInSeconds') * 1000;
		this._parallelismDelayMillis = protocolConfig.get('protocol.findClosestNodes.parallelismDelayInSeconds') * 1000;

		this._myNode = myNode;
		this._protocolConnectionManager = protocolConnectionManager;
		this._proxyManager = proxyManager;
		this._routingTable = routingTable;

		this._writableMessageFactory = new FoundClosestNodesWritableMessageFactory();
		this._readableMessageFactory = new FoundClosestNodesReadableMessageFactory();

		this._setupListeners();
	}

	private _setupListeners ():void {

		this._proxyManager.on('message', (message:ReadableMessageInterface) => {
			var type:string = message.getMessageType();

			if (type === 'FIND_CLOSEST_NODES') {
				var id:IdInterface = null;

				try {
					id = new Id(message.getPayload(), 160);
				}
				catch (e) {}

				if (id) {
					this._replyToFindNodesFor(message.getSender(), id);
				}
			}
			else if (type === 'FOUND_CLOSEST_NODES') {
				var foundClosestNodesMsg:FoundClosestNodesReadableMessageInterface = null
				try {
					foundClosestNodesMsg = this._readableMessageFactory.create(message.getPayload());
				}
				catch (e) {}

				if (foundClosestNodesMsg) {
					this.emit(foundClosestNodesMsg.getSearchedForId().toHexString(), message.getSender(), foundClosestNodesMsg);
				}
			}
		});
	}

	private _replyToFindNodesFor (requestingNode:ContactNodeInterface, searchForId:IdInterface):void {
		if (this._myNode.getId().equals(searchForId)) {
			var idBuffer = searchForId.getBuffer();
			idBuffer[19] === 0xff ? idBuffer[19]-- : idBuffer[19]++;
		}

		this._routingTable.getClosestContactNodes (searchForId, requestingNode.getId(), (err:Error, contacts:ContactNodeListInterface) => {
			if (!err && contacts && contacts.length) {
				var payload:Buffer = null;
				try {
					payload = this._writableMessageFactory.constructPayload(searchForId, contacts);
				}
				catch (e) {}

				if (payload) {
					this._protocolConnectionManager.writeMessageTo(requestingNode, 'FOUND_CLOSEST_NODES', payload);
				}
			}
		});
	}

	public startCycleFor (searchForId:IdInterface):void {
		this._routingTable.getClosestContactNodes (searchForId, null, (err:Error, contacts:ContactNodeListInterface) => {
			if (!err && contacts && contacts.length) {

				var identifier:string = searchForId.toHexString();

				if (this._pendingCycles.indexOf(identifier) === -1) {

					var startWithList:ContactNodeListInterface = contacts.splice(0, Math.min(contacts.length, this._alpha));

					this._pendingCycles.push(identifier);

					new FindClosestNodesCycle(searchForId, startWithList, this, this._protocolConnectionManager, (resultingList:ContactNodeListInterface) => {

						this._pendingCycles.splice(this._pendingCycles.indexOf(identifier), 1);

						this.emit('foundClosestNodes', searchForId, resultingList);
					});
				}

			}
		});
	}

	public getK ():number {
		return this._k;
	}

	public getAlpha ():number {
		return this._alpha;
	}

	public getCycleExpirationMillis ():number {
		return this._cycleExpirationMillis;
	}

	public getParallelismDelayMillis ():number {
		return this._parallelismDelayMillis;
	}



}

export = FindClosestNodesManager;