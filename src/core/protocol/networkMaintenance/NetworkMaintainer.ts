import events = require('events');

import NetworkMaintainerInterface = require('./interfaces/NetworkMaintainerInterface');
import NodeSeekerManagerInterface = require('./nodeDiscovery/nodeSeeker/interfaces/NodeSeekerManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import FindClosestNodesManagerInterface = require('../findClosestNodes/interfaces/FindClosestNodesManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');

class NetworkMaintainer extends events.EventEmitter implements NetworkMaintainerInterface {

	/**
	 * Stores the timeouts to a bucket by its index.
	 *
	 * @member {Array<number>} core.protocol.networkMaintenance.NetworkMaintainer~_bucketRefreshes
	 */
	private _bucketRefreshes:Array<number> = [];

	/**
	 * Indicates in ms the time after which an otherwise unaccessed bucket must be refreshed.
	 *
	 * @member {Array<number>} core.protocol.networkMaintenance.NetworkMaintainer~_bucketRefreshRateInMs
	 */
	private _bucketRefreshRateInMs:number = 0;

	/**
	 * A FindClosestNodesManager
	 *
	 * @member {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_findClosestNodesManager
	 */
	private _findClosestNodesManager:FindClosestNodesManagerInterface = null;

	/**
	 * Indicates whether `joinNetwork` has been called or not.
	 *
	 * @member {boolean} core.protocol.networkMaintenance.NetworkMaintainer~_joinedNetwork
	 */
	private _joinedNetwork:boolean = false;

	/**
	 * The ID which differs in 0th bit to MyNode's ID.
	 *
	 * @member {core.topology.IdInterface} core.protocol.networkMaintenance.NetworkMaintainer~_myIdToSearchFor
	 */
	private _myIdToSearchFor:IdInterface = null;

	/**
	 * My Node.
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.networkMaintenance.NetworkMaintainer~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * The bucket index of the nearest active neighbor.
	 *
	 * @member {number} core.protocol.networkMaintenance.NetworkMaintainer~_nearestAccessedBucket
	 */
	private _nearestAccessedBucket:number = -1;

	/**
	 * A NodeSeekerManager.
	 *
	 * @member {core.protocol.nodeDiscovery.NodeSeekerManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_nodeSeekerManager
	 */
	private _nodeSeekerManager:NodeSeekerManagerInterface = null;

	/**
	 * The number of buckets in the routing table. Populated by config.
	 *
	 * @member {number} core.protocol.networkMaintenance.NetworkMaintainer~_numberOfBuckets
	 */
	private _numberOfBuckets:number = 0;

	/**
	 * A ProxyManager.
	 *
	 * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_proxyManager
	 */
	private _proxyManager:ProxyManagerInterface = null;


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

			this._proxyManager.on('contactNodeInformation', (node:ContactNodeInterface) => {
				this._handleBucketAccess(node);
			});

			this._findEntryNodeAndJoin(null);
		}
	}

	private _findEntryNodeAndJoin (avoidNode:ContactNodeInterface):void {
		this._nodeSeekerManager.forceFindActiveNode(avoidNode, (node:ContactNodeInterface) => {
			this._findClosestNodesManager.startCycleFor(this._myIdToSearchFor, [node]);

			this._findClosestNodesManager.once('foundClosestNodes', (searchForId:IdInterface, resultingList:ContactNodeListInterface) => {
				if (!resultingList.length) {
					setImmediate(() => {
						this._findEntryNodeAndJoin(node);
					});
				}
				else {
					this._finalizeEntryWithBucketRefreshes();
				}
			});
		});
	}

	private _handleBucketAccess (node:ContactNodeInterface) {
		var bucketNumber:number = this._myNode.getId().differsInHighestBit(node.getId());

		if (bucketNumber >= 0) {
			if (this._nearestAccessedBucket === -1 || this._nearestAccessedBucket > bucketNumber) {
				this._nearestAccessedBucket = bucketNumber;
			}

			this._clearBucketRefreshTimeout(bucketNumber);
			this._setBucketRefreshTimeout(bucketNumber);
		}

	}

	private _finalizeEntryWithBucketRefreshes ():void {
		var queriedIds:Array<string> = [];

		var checkAndEmitFinal = (searchForId:IdInterface) => {
			var searchForHex:string = searchForId.toHexString();
			var index:number = queriedIds.indexOf(searchForHex);
			if (index >= 0) {
				queriedIds.splice(index, 1);
				if (queriedIds.length === 0) {
					this._findClosestNodesManager.removeListener('foundClosestNodes', checkAndEmitFinal);
					this.emit('joinedNetwork');
				}
			}
		};

		if (this._nearestAccessedBucket + 1 < this._numberOfBuckets) {
			this._findClosestNodesManager.on('foundClosestNodes', checkAndEmitFinal);

			for (var i = this._nearestAccessedBucket + 1; i < this._numberOfBuckets; i++) {
				queriedIds.push(this._refreshBucket(i).toHexString());
			}
		}

	}

	private _prepopulateBucketRefreshes ():void {
		for (var i = 0; i < this._numberOfBuckets; i++) {
			((bucketNumber:number) => {
				this._setBucketRefreshTimeout(bucketNumber);
			})(i);
		}
	}

	private _setBucketRefreshTimeout (bucketNumber:number):void {
		if (!this._bucketRefreshes[bucketNumber]) {
			this._bucketRefreshes[bucketNumber] = setTimeout(() => {
				this._bucketRefreshes[bucketNumber] = 0;
				this._refreshBucket(bucketNumber);
			}, this._bucketRefreshRateInMs);
		}
	}


	private _clearBucketRefreshTimeout (bucketNumber:number):void {
		if (this._bucketRefreshes[bucketNumber]) {
			clearTimeout(this._bucketRefreshes[bucketNumber]);
			this._bucketRefreshes[bucketNumber] = 0;
		}
	}

	private _refreshBucket (bucketNumber:number):IdInterface {
		var idToSearchFor:IdInterface = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

		this.emit('refreshingBucket', bucketNumber);

		this._findClosestNodesManager.startCycleFor(idToSearchFor);
		this._setBucketRefreshTimeout(bucketNumber);

		return idToSearchFor;
	}

}

export = NetworkMaintainerInterface;