import events = require('events');

import NetworkMaintainerInterface = require('./interfaces/NetworkMaintainerInterface');
import NodeSeekerManagerInterface = require('./nodeDiscovery/nodeSeeker/interfaces/NodeSeekerManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import FindClosestNodesManagerInterface = require('../findClosestNodes/interfaces/FindClosestNodesManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');

class NetworkMaintainer extends events.EventEmitter implements NetworkMaintainerInterface {

	private _myNode:MyNodeInterface = null;
	private _nodeSeekerManager:NodeSeekerManagerInterface = null;
	private _findClosestNodesManager:FindClosestNodesManagerInterface = null;
	private _proxyManager:ProxyManagerInterface = null;

	private _bucketRefreshRateInMs:number = 0;
	private _numberOfBuckets:number = 0;

	private _myIdToSearchFor:IdInterface = null;

	private _bucketRefreshes:Array<number> = [];

	private _joinedNetwork:boolean = false;

	constructor (topologyConfig:ConfigInterface, protocolConfig:ConfigInterface, myNode:MyNodeInterface, nodeSeekerManager:NodeSeekerManagerInterface, findClosestNodesManager:FindClosestNodesManagerInterface, proxyManager:ProxyManagerInterface) {
		super();

		this._bucketRefreshRateInMs = protocolConfig.get('protocol.networkMaintenance.bucketRefreshRateInSeconds') * 1000;
		this._numberOfBuckets = topologyConfig.get('topology.bitLength');

		this._myNode = myNode;
		this._nodeSeekerManager = nodeSeekerManager;
		this._findClosestNodesManager = findClosestNodesManager;
		this._proxyManager = proxyManager;

		this._myIdToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), 0);
	}

	public joinNetwork ():void {
		if (!this._joinedNetwork) {
			this._joinedNetwork = true;

			this._prepopulateBucketRefreshes();

		}


	}

	private _prepopulateBucketRefreshes ():void {
		for (var i=0; i<this._numberOfBuckets; i++) {
			((bucketNumber:number) => {
				this._bucketRefreshes[bucketNumber] = setTimeout(() => {
					this._refreshBucket(bucketNumber);
				}, this._bucketRefreshRateInMs);
			})(i);
		}
	}

	private _refreshBucket (bucketNumber:number):void {
		var idToSearchFor:IdInterface = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

		this.emit('refreshingBucket', bucketNumber);

		this._findClosestNodesManager.startCycleFor(idToSearchFor);
	}

}

export = NetworkMaintainerInterface;