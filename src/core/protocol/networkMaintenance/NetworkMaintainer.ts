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

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * NetworkMaintainerInterface implementation.
 *
 * @class core.protocol.networkMaintenance.NetworkMaintainer
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.networkMaintenance.NetworkMaintainerInterface
 *
 * @param {core.config.ConfigInterface} topologyConfig Topology configuration object
 * @param {core.config.ConfigInterface} protocolConfig Protocol configuration object
 * @param {core.topology.MyNodeInterface} myNode MyNode instance.
 * @param {core.protocol.nodeDiscovery.NodeSeekerManagerInterface} A node seeker manager.
 * @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} FindClosestNodesManager instance.
 * @oaram {core.protocol.proxy.ProxyManagerInterface} A working ProxyManager instance.
 */
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

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getJoinedNetwork():boolean {
		return this._joinedNetwork;
	}

	public getNearestAccessedBucket():number {
		return this._nearestAccessedBucket;
	}

	public getBucketRefreshes():Array<number> {
		return this._bucketRefreshes;
	}

	public getMyIdToSearchFor():IdInterface {
		return this._myIdToSearchFor;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

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

	/**
	 * Clears the refresh timeout (if existing) of a bucket by its index
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_clearBucketRefreshTimeout
	 *
	 * @param {number} bucketNumber The bucket index
	 */
	private _clearBucketRefreshTimeout (bucketNumber:number):void {
		if (this._bucketRefreshes[bucketNumber]) {
			clearTimeout(this._bucketRefreshes[bucketNumber]);
			this._bucketRefreshes[bucketNumber] = 0;
		}
	}

	/**
	 * Issues FIND_CLOSEST_NODES cycles on the buckets further away than the closest neighbor.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_finalizeEntryWithBucketRefreshes
	 */
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
		else {
			this.emit('joinedNetwork');
		}

	}

	/**
	 * Force finds an initial contact node and sends a FIND_CLOSEST_NODES query to it containing an ID merely differing
	 * in the 0th bit to MyNode's ID.
	 * If the query returns no additional nodes, another initial contact node is searched for and the process repeats,
	 * otherwise the node entry process is finalized by issuing bucket refreshes.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_findEntryNodeAndJoin
	 *
	 * @param {core.topology.ContactNodeInterface} avoidNode Node to avoid when force finding an initial contact.
	 */
	private _findEntryNodeAndJoin (avoidNode:ContactNodeInterface):void {
		logger.info('trying to find entry node');
		this._nodeSeekerManager.forceFindActiveNode(avoidNode, (node:ContactNodeInterface) => {
			this._findClosestNodesManager.startCycleFor(this._myIdToSearchFor, [node]);

			logger.info('Force found entry node', {id: node.getId().toHexString()});

			this._findClosestNodesManager.once('foundClosestNodes', (searchForId:IdInterface, resultingList:ContactNodeListInterface) => {
				logger.info('Found closest nodes', {length: resultingList.length});

				if (!resultingList.length) {
					setImmediate(() => {
						this._findEntryNodeAndJoin(node);
					});
				}
				else {
					this.emit('initialContactQueryCompleted');
					this._finalizeEntryWithBucketRefreshes();
				}
			});
		});
	}

	/**
	 * The function gets called as soon as the proxy manager emits a 'contactNodeInformation' event, i.e. information to
	 * an active node is seen.
	 * The timeout of the bucket which the node would be assigned to is refreshed.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_handleBucketAccess
	 *
	 * @param {core.topology.ContactNodeInterface} node The seen contact node.
	 */
	private _handleBucketAccess (node:ContactNodeInterface):void {
		var bucketNumber:number = this._myNode.getId().differsInHighestBit(node.getId());

		if (bucketNumber >= 0) {
			if (this._nearestAccessedBucket === -1 || this._nearestAccessedBucket > bucketNumber) {
				this._nearestAccessedBucket = bucketNumber;
			}

			this._clearBucketRefreshTimeout(bucketNumber);
			this._setBucketRefreshTimeout(bucketNumber);
		}

	}

	/**
	 * Iterates over the overall number of buckets and sets a refresh timeout on them.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_prepopulateBucketRefreshes
	 */
	private _prepopulateBucketRefreshes ():void {
		for (var i = 0; i < this._numberOfBuckets; i++) {
			((bucketNumber:number) => {
				this._setBucketRefreshTimeout(bucketNumber);
			})(i);
		}
	}

	/**
	 * Refreshes a bucket by issuing a FIND_CLOSEST_NODES cycle on a random ID which would be assigned to the said bucket.
	 * Emits a `refreshingBucket` event with the bucket index as argument.
	 * Renews the bucket refresh timeout.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_refreshBucket
	 *
	 * @param {number} bucketNumber The index of the bucket to refresh
	 * @returns {IdInterface} The search for ID of the resulting FIND_CLOSEST_NODES cycle.
	 */
	private _refreshBucket (bucketNumber:number):IdInterface {
		var idToSearchFor:IdInterface = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

		this.emit('refreshingBucket', bucketNumber);

		this._findClosestNodesManager.startCycleFor(idToSearchFor);
		this._setBucketRefreshTimeout(bucketNumber);

		return idToSearchFor;
	}

	/**
	 * Sets a bucket refresh timeout by a bucket index.
	 *
	 * @method core.protocol.networkMaintenance.NetworkMaintainer~_setBucketRefreshTimeout
	 *
	 * @param {number} bucketNumber Index of the bucket to set the timeout on.
	 */
	private _setBucketRefreshTimeout (bucketNumber:number):void {
		if (!this._bucketRefreshes[bucketNumber]) {
			this._bucketRefreshes[bucketNumber] = setTimeout(() => {
				this._bucketRefreshes[bucketNumber] = 0;
				this._refreshBucket(bucketNumber);
			}, this._bucketRefreshRateInMs);
		}
	}

}

export = NetworkMaintainer;