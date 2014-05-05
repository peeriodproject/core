import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');
import BucketInterface = require('./interfaces/BucketInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('./interfaces/ContactNodeListInterface');
import IdInterface = require('./interfaces/IdInterface');
import RoutingTableInterface = require('./interfaces/RoutingTableInterface');
import RoutingTableOptions = require('./interfaces/RoutingTableOptions');

import BucketStore = require('./BucketStore');
import Bucket = require('./Bucket');
import JSONConfig = require('../config/JSONConfig');
import ObjectUtils = require('../utils/ObjectUtils');

/**
 * Creates a routing table with the given number of k-buckets
 *
 * @class core.topology.RoutingTable
 * @implements RoutingTableInterface
 *
 * @param {config.ConfigInterface} config
 * @param {core.topology.IdInterface} id
 * @param {core.topology.BucketStoreInterface} bucketStore
 */
class RoutingTable implements RoutingTableInterface {

	/**
	 * @member {core.topology.BucketFactoryInterface} core.topologyRoutingTable~_bucketFactory
	 */
	private _bucketFactory:BucketFactoryInterface = null;

	/**
	 * The internally used bucket store instance.
	 *
	 * @member {core.topology.BucketStoreInterface} core.topology.RoutingTable~_bucketStore
	 */
	private _bucketStore:BucketStoreInterface = null;

	/**
	 * The internally used list of buckets
	 *
	 * @member {Array.<topology.BucketInterface>} core.topology.RoutingTable~_buckets
	 */
	private _buckets:{[key:string]: BucketInterface} = {};

	/**
	 * The internally used config object instance. Usually just for reference and passed through to the Bucket
	 *
	 * @member {core.config.ConfigInterface} core.topology.RoutingTable~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The Id of the node who owns the routing table
	 *
	 * @member {core.topology.IdInterface} core.topology.RoutingTable~_id
	 */
	private _id:IdInterface = null;

	/**
	 * A flag indicates weather the store is open or closed
	 *
	 * @member {boolean} core.topology.RoutingTable~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The mix of the passed in options object and the defaults
	 *
	 * @member {core.topology.RoutingTableOptions} core.topology.RoutingTable~_options
	 */
	private _options:RoutingTableOptions = null;

	constructor (config:ConfigInterface, id:IdInterface, bucketFactory:BucketFactoryInterface, bucketStore:BucketStoreInterface, options:RoutingTableOptions = {}) {

		var defaults:RoutingTableOptions = {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._id = id;
		this._bucketFactory = bucketFactory;
		this._bucketStore = bucketStore;

		// todo merge opts & defaults
		this._options = ObjectUtils.extend(defaults, options);
		;

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	// todo check bucket.close() return value
	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return internalCallback(null);
		}

		this._isOpen = false;

		for (var key in this._buckets) {
			this._buckets[key].close();
		}

		this._buckets = null;
		internalCallback(null);
	}

	public getClosestContactNodes (id:IdInterface, callback:(err:Error, contacts:ContactNodeListInterface) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		var startBucketKey = this._getBucketKey(id);
		console.log(startBucketKey);

	}

	public getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var bucketKey = this._getBucketKey(id);

		this._buckets[bucketKey].get(id, internalCallback);
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):boolean {
		return callback(null, this._isOpen);
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return internalCallback(null);
		}

		this._buckets = {};

		for (var i = 0, k = this._config.get('topology.bitLength'); i < k; i++) {
			this._createBucket(i);
		}

		this._isOpen = true;
		internalCallback(null);
	}

	public updateContactNode (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var bucketKey:string = this._getBucketKey(contact.getId());

		this._buckets[bucketKey].update(contact, internalCallback);
	}

	// todo updateId Ideas
	public updateId (id:IdInterface):void {
		return;
	}

	/**
	 * Creates a bucket with the given key.
	 *
	 * @method core.topology.RoutingTable~_createBucket
	 *
	 * @param {string} key
	 */
	private _createBucket (key:number) {
		this._buckets[key] = this._bucketFactory.create(this._config, key, this._bucketStore);
	}

	/**
	 * Returns the bucket key where the given id should be stored.
	 * See {@link core.topology.Id.differsInHighestBit} for more information.
	 *
	 * @method core.topology.RoutingTable~_getBucketKey
	 *
	 * @param {core.topology.IdInterface} id
	 * @return {string}
	 */
	private _getBucketKey (id:IdInterface):string {
		return this._id.differsInHighestBit(id).toString();
	}

}

export = RoutingTable;