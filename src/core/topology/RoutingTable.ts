import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');
import BucketInterface = require('./interfaces/BucketInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
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
	 * The internally used contact node factory instance. Usually just for reference and passed through to the Bucket
	 *
	 * @member {core.topology.ContactNodeFactoryInterface} core.topology.RoutingTable~_contactNodeFactory
	 */
	private _contactNodeFactory:ContactNodeFactoryInterface = null;

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

	constructor (config:ConfigInterface, id:IdInterface, bucketFactory:BucketFactoryInterface, bucketStore:BucketStoreInterface, contactNodeFactory:ContactNodeFactoryInterface, options:RoutingTableOptions = {}) {

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
		this._contactNodeFactory = contactNodeFactory;

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
		var startBucketKey:number = this._getBucketKey(id);

		var distances:Array<Buffer> = [];
		var distanceMap:{ [key:string]:ContactNodeInterface; } = {};

		var addContactToDistanceMap:Function = function (contactDistance:Buffer, contact:ContactNodeInterface) {
			distances.push(contactDistance);
			distanceMap[contactDistance.toString('hex')] = contact;
			distances.sort();
		};
		var getContactFromDistanceMap = function (contactDistance:Buffer):ContactNodeInterface {
			return distanceMap[contactDistance.toString('hex')];
		};


		var crawlBucket = (crawlBucketKey:number, crawlReverse:boolean, onCrawlEnd:Function) => {
			//console.log('crawling bucket', crawlBucketKey);

			this._getBucket(crawlBucketKey).getAll((err:Error, contacts:ContactNodeListInterface) => {
				if (contacts.length) {
					for (var i in contacts) {
						var contact:ContactNodeInterface = contacts[i];
						var contactId:IdInterface = contact.getId();

						// exclude target id
						if (!id.equals(contactId)) {
							if (!distances.length) {
								var dist = id.distanceTo(contactId);
								addContactToDistanceMap(dist, contact);
							}
							else {
								var farestDistance = distances[distances.length - 1];
								var contactDistance = id.distanceTo(contactId);

								// contact is closer -> adding
								if (contactDistance < farestDistance) {
									addContactToDistanceMap(contactDistance, contact);
								}
								// still space in the list -> adding
								else if (distances.length < this._config.get('topology.k')) {
									addContactToDistanceMap(contactDistance, contact);
								}
							}

							if (distances.length === this._config.get('topology.k')) {
								break;
							}
						}
						else {
							//console.log('excluded target id!');
						}
					}
				}

				// top-to-bottom search: going to crawl the next bucket
				if (!crawlReverse) {
					if (crawlBucketKey < this._config.get('topology.bitLength') - 1) {
						//console.log('crawl the next (child) bucket');
						crawlBucket(++crawlBucketKey, false, onCrawlEnd);
					}
					// reached the bottom of the store.
					else {
						//console.log('reached the end of the bucket store.');

						// we have still less then topology.k contacts.
						// starting reverse (bottom-to-top) search at startBucketKey - 1
						if (distances.length < this._config.get('topology.k')) {
							//console.log('starting reverse search!');
							crawlBucket(--startBucketKey, true, onCrawlEnd);
						}
						// we found topology.k nodes. ending...
						else {
							//console.log('found nodes! ending...');
							onCrawlEnd();
						}
					}
				}
				// reverse (bottom-to-top) search: going to crawl the previous bucket
				else {
					// crawling the previous bucket
					if (crawlBucketKey > 0) {
						//console.log('crawl the previous bucket', distances.length);
						crawlBucket(--crawlBucketKey, true, onCrawlEnd);
					}
					// reached the top of the store. ending...
					else {
						//console.log('reached the top of the bucket store. ending...');
						onCrawlEnd();
					}
				}
			});
		};

		crawlBucket(startBucketKey, false, function () {
			var closestContactNodes:ContactNodeListInterface = [];

			if (distances.length) {
				for (var i in distances) {
					closestContactNodes.push(getContactFromDistanceMap(distances[i]));
				}
			}

			internalCallback(null, closestContactNodes);

			distances = null;
			distanceMap = null;
		});
	}

	public getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var bucketKey:number = this._getBucketKey(id);

		this._getBucket(bucketKey).get(id, internalCallback);
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
			this._createBucket(i, this._config.get('topology.k'));
		}

		this._isOpen = true;
		internalCallback(null);
	}

	public updateContactNode (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var bucketKey:number = this._getBucketKey(contact.getId());

		this._getBucket(bucketKey).update(contact, internalCallback);
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
	 * @param {string} bucketKey
	 * @param {number} maxBucketSize
	 */
	private _createBucket (bucketKey:number, maxBucketSize:number) {
		this._buckets[this._getBucketKeyString(bucketKey)] = this._bucketFactory.create(this._config, bucketKey, maxBucketSize, this._bucketStore, this._contactNodeFactory);
	}

	/**
	 * Returns the bucket key where the given id should be stored.
	 * See {@link core.topology.Id.differsInHighestBit} for more information.
	 *
	 * @method core.topology.RoutingTable~_getBucketKey
	 *
	 * @param {core.topology.IdInterface} id
	 * @return {number}
	 */
	private _getBucketKey (id:IdInterface):number {
		return this._id.differsInHighestBit(id);
	}

	private _getBucketKeyAsString (id:IdInterface):string {
		return    this._getBucketKeyString(this._getBucketKey(id));
	}

	private _getBucketKeyString (key:number):string {
		return key.toString();
	}

	private _getBucket (bucketKey:number):BucketInterface {
		return this._buckets[this._getBucketKeyString(bucketKey)]
	}

}

export = RoutingTable;