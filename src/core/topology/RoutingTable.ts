import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
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
//import JSONConfig = require('../config/JSONConfig');
import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * Creates a routing table with the given number of k-buckets
 *
 * @class core.topology.RoutingTable
 * @implements RoutingTableInterface
 *
 * @param {config.ConfigInterface} config
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
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
	 * A flag indicates whether the store is open or closed
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

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, id:IdInterface, bucketFactory:BucketFactoryInterface, bucketStore:BucketStoreInterface, contactNodeFactory:ContactNodeFactoryInterface, options:RoutingTableOptions = {}) {

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

		this._options = ObjectUtils.extend(defaults, options);

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	// todo check bucket.close() return value
	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._isOpen = false;
		logger.log('routingTable', 'closed');

		for (var key in this._buckets) {
			this._buckets[key].close();
		}

		this._buckets = null;

		return process.nextTick(internalCallback.bind(null, null));
	}

	public getAllContactNodes (callback:(err:Error, contacts:ContactNodeListInterface) => any):void {
		var contactLastSeenMap:{ [lastSeen:number]:ContactNodeInterface } = {};
		var allContactsList:ContactNodeListInterface = [];
		var bucketAmount:number = this._getBucketAmount();
		var bucketsReturned:number = 0;
		var checkAndCallback = function (err:Error, bucketContacts:ContactNodeListInterface) {
			bucketsReturned++;

			if (err) {
				bucketsReturned = -1;

				return callback(err, []);
			}

			if (bucketContacts) {
				for (var i = 0, l = bucketContacts.length; i < l; i++) {
					var contact:ContactNodeInterface = bucketContacts[i];

					contactLastSeenMap[contact.getLastSeen()] = contact;
				}
			}

			if (bucketsReturned === bucketAmount) {
				var lastSeenKeys = Object.keys(contactLastSeenMap);

				if (!lastSeenKeys.length) {
					return callback(null, []);
				}

				lastSeenKeys.sort();

				for (var i = 0, l = lastSeenKeys.length; i < l; i++) {
					allContactsList.push(contactLastSeenMap[lastSeenKeys[i]]);
				}

				return callback(null, allContactsList.slice());
			}
		};

		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, []));
		}

		for (var i = 0; i < bucketAmount; i++) {
			this._getBucket(i).getAll((err:Error, contacts:ContactNodeListInterface) => {
				return checkAndCallback(err, contacts);
			});
		}
	}

	public getAllContactNodesSize (callback:(err:Error, count:number) => any):void {
		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, 0));
		}

		var bucketKeys = Object.keys(this._buckets);
		var processed:number = 0;
		var contactNodeCount:number = 0;

		var checkCallback:Function = function (err) {
			if (processed === bucketKeys.length) {
				callback(null, contactNodeCount);
			}
		};

		if (bucketKeys.length) {
			for (var i = 0, l = bucketKeys.length; i < l; i++) {
				this._buckets[bucketKeys[i]].size(function (err, size) {
					processed++;
					contactNodeCount += size;

					checkCallback(err);
				});
			}
		}
	}

	public getClosestContactNodes (id:IdInterface, excludeId:IdInterface, callback:(err:Error, contacts:ContactNodeListInterface) => any):void {
		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, []));
		}

		var startBucketKey:number = this._getBucketKey(id);

		if (!this._isInBucketKeyRange(startBucketKey)) {
			return process.nextTick(callback.bind(null, new Error('RoutingTable.getClosestContactNode: cannot get closest contact nodes for the given Id.'), null));
		}

		var topologyK:number = this._config.get('topology.k');
		var bucketAmount:number = this._getBucketAmount();

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
			var bucketGetAllCallback = (err:Error, contacts:ContactNodeListInterface) => {
				if (contacts.length) {
					for (var i = 0, l = contacts.length; i < l; i++) {
						var contact:ContactNodeInterface = contacts[i];
						var contactId:IdInterface = contact.getId();

						// exclude id
						if (excludeId !== null && contactId.equals(excludeId)) {
							//console.log('EXCLUDED excludeId!');
							continue;
						}

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
							else if (distances.length < topologyK) {
								addContactToDistanceMap(contactDistance, contact);
							}
						}

						if (crawlReverse && distances.length === topologyK) {
							break;
						}
					}
				}

				if (!crawlReverse) {
					if (crawlBucketKey > 0) {
						crawlBucket(--crawlBucketKey, false, onCrawlEnd);
					}
					else {
						//console.log('reached the first bucket.');
						if (distances.length < topologyK && startBucketKey < bucketAmount - 1) {
							//console.log('starting reverse search!');
							crawlBucket(++startBucketKey, true, onCrawlEnd);
						}
						else {
							//console.log('found nodes! ending...');
							onCrawlEnd();
						}
					}
				}
				else {
					if (crawlBucketKey < bucketAmount - 1) {
						//console.log('crawl the next bucket', distances.length);
						crawlBucket(++crawlBucketKey, true, onCrawlEnd);
					}
					else {
						//console.log('reached the last bucket ' + (bucketAmount - 1) + '. ending...');
						onCrawlEnd();
					}
				}
			};
			//console.log('bucket', crawlBucketKey);

			this._getBucket(crawlBucketKey).getAll(bucketGetAllCallback);
		};

		crawlBucket(startBucketKey, false, function () {
			var closestContactNodes:ContactNodeListInterface = [];

			// console.log(distances);

			if (distances.length) {
				for (var i = 0, l = distances.length; i < l; i++) {
					if (i < topologyK) {
						closestContactNodes.push(getContactFromDistanceMap(distances[i]));
					}
				}
			}

			callback(null, closestContactNodes.slice());

			distances = null;
			distanceMap = null;
		});
	}

	public getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, null));
		}

		var bucketKey:number = this._getBucketKey(id);

		if (this._isInBucketKeyRange(bucketKey)) {
			this._getBucket(bucketKey).get(id, callback);
		}
		else {
			return process.nextTick(callback.bind(null, new Error('RoutingTable.getContactNode: cannot get the contact node.'), null));
		}
	}

	public getRandomContactNode (callback:(err:Error, contact:ContactNodeInterface) => any):void {
		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, null));
		}

		this._getBucketSizes((sizes) => {
			if (!this._isOpen) {
				return callback(null, null);
			}

			var bucketKeys = Object.keys(sizes);

			if (!bucketKeys.length) {
				return callback(null, null);
			}

			var randomBucketIndex:number = Math.floor(Math.random() * bucketKeys.length);
			var randomBucketKey:string = bucketKeys[randomBucketIndex];

			this._buckets[randomBucketKey].getRandom(function (err:Error, contact:ContactNodeInterface) {
				return callback(null, contact);
			});
		});
	}

	public getRandomContactNodesFromBucket (bucketKey:number, amount:number, callback:(err:Error, contactNodes:ContactNodeListInterface) => any):void {
		if (!this._isOpen) {
			return process.nextTick(callback.bind(null, null, []));
		}

		if (!this._isInBucketKeyRange(bucketKey)) {
			return process.nextTick(callback.bind(null, new Error('RoutingTable.getRandomContactNodesFromBucket: The bucket key is out of range.'), null));
		}

		this._getBucket(bucketKey).getAll((err:Error, contacts:ContactNodeListInterface) => {
			var contactLength:number;

			if (err) {
				return callback(err, null);
			}

			contactLength = contacts.length;

			if (!contactLength || contactLength <= amount) {
				return callback(null, contacts);
			}
			else {
				return callback(null, this._getRandomizedArray(contacts).slice(0, amount));
			}
		});

	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._buckets = {};

		for (var i = 0, k = this._getBucketAmount(); i < k; i++) {
			this._createBucket(i, this._config.get('topology.k'));
		}

		this._isOpen = true;

		logger.log('routingTable', 'opened');

		return process.nextTick(internalCallback.bind(null, null));
	}

	public replaceContactNode (oldContactNode:ContactNodeInterface, newContactNode:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error, longestNotSeenContact:ContactNodeInterface) {
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null, null));
		}

		var oldContactNodeId:IdInterface = oldContactNode.getId();
		var newContactNodeId:IdInterface = newContactNode.getId();

		var oldBucketKey:number = this._getBucketKey(oldContactNodeId);
		var newBucketKey:number = this._getBucketKey(newContactNodeId);


		if (oldBucketKey !== newBucketKey) {
			logger.error('can not replace nodes in bucket', {
				oldBucketKey: oldBucketKey,
				oldId       : oldContactNodeId.toBitString(),
				newBucketKey: newBucketKey,
				newId       : newContactNodeId.toBitString()

			});

			return internalCallback(new Error('RoutingTable.replaceContactNode: Cannot replace the given contact nodes. They dont belong to the same Bucket.'), null);
		}

		this._getBucket(newBucketKey).remove(oldContactNodeId, (err:Error) => {
			if (err) {
				return internalCallback(err, null);
			}

			this._getBucket(newBucketKey).add(newContactNode, (err:Error, longestNotSeenContact:ContactNodeInterface) => {
				return internalCallback(err, longestNotSeenContact);
			});
		});
	}

	public updateContactNode (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null, null));
		}

		var bucketKey:number = this._getBucketKey(contact.getId());

		if (this._isInBucketKeyRange(bucketKey)) {
			this._getBucket(bucketKey).update(contact, internalCallback);
		}
		else {
			return process.nextTick(internalCallback.bind(null, new Error('RoutingTable.updateContactNode: cannot update the given contact node.'), null));
		}
	}

	/**
	 * Creates a bucket with the given key.
	 *
	 * @method core.topology.RoutingTable~_createBucket
	 *
	 * @param {string} bucketKey
	 * @param {number} maxBucketSize
	 */
	private _createBucket (bucketKey:number, maxBucketSize:number):void {
		this._buckets[this._convertBucketKeyToString(bucketKey)] = this._bucketFactory.create(this._config, bucketKey, maxBucketSize, this._bucketStore, this._contactNodeFactory);
	}

	/**
	 * Converts the bucket key from a number to a string so we can use the strinified key to make requests to the database
	 *
	 * @method core.topology.RoutingTable~_convertBucketKeyToString
	 *
	 * @param {number} key
	 * @returns {string}
	 */
	private _convertBucketKeyToString (key:number):string {
		return key.toString();
	}

	/**
	 * Returns the bucket for the given key. It uses the {@link core.topology.RoutingTable~_convertBucketKeyToString} method
	 * for convertion.
	 *
	 * @method core.topology.RoutingTable~_getBucket
	 *
	 * @param {number} bucketKey
	 * @returns {core.topology.BucketInterface}
	 */
	private _getBucket (bucketKey:number):BucketInterface {
		return this._buckets[this._convertBucketKeyToString(bucketKey)]
	}

	/**
	 * Returns the amount of buckets the routing table manages.
	 *
	 * @method core.topology.RoutingTable~_getBucketAmount
	 *
	 * @returns {number}
	 */
	private _getBucketAmount ():number {
		return this._config.get('topology.bitLength');
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

	/**
	 * Returns a map of bucketKeys and the corresponding size of contact nodes if the bucket. Empty buckets are __excluded__ from the map.
	 *
	 * @method core.topology.RoutingTable~_getBucketSizes
	 *
	 * @param {Function} callback The callback that gets called with the map as the first argument after all bucket sizes were collected.
	 */
	private _getBucketSizes (callback:(sizes:Object) => any):void {
		if (!this._buckets) {
			return process.nextTick(callback.bind(null, {}));
		}

		var bucketKeys = Object.keys(this._buckets);
		var bucketKeysLength = bucketKeys.length;

		var returned:number = 0;
		var sizes = {};
		var checkAndReturn = function () {
			if (returned === bucketKeysLength) {

				return callback(sizes);
			}
		};

		bucketKeys.forEach((key) => {
			this._buckets[key].size(function (err, size) {
				size = size || 0;

				if (size) {
					sizes[key] = size;
				}

				returned++;

				return checkAndReturn();
			});
		});
	}

	/**
	 * Returns a shuffled copy of the given array.
	 *
	 * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
	 * @see http://sroucheray.org/blog/2009/11/array-sort-should-not-be-used-to-shuffle-an-array/
	 *
	 * @method core.topology.RoutingTable~_getRandomizedArray
	 *
	 * @param {Array} input The array to shuffle
	 * @returns {Array} the shuffled copy of the input array
	 */
	private _getRandomizedArray (input:Array<any>):Array<any> {
		var output:Array<any> = input.slice();
		var i = output.length;
		var j;
		var temp;


		if (i === 0) {
			return;
		}

		while (--i) {
			j = Math.floor(Math.random() * ( i + 1 ));
			temp = output[i];
			output[i] = output[j];
			output[j] = temp;
		}

		return output;
	}

	/*
	 * this method will be used whenever node-lmdb updates it's code from nodes SlowBuffer to the new node Buffer class
	 */
	//private _getBucketKeyAsString (id:IdInterface):string {
	//	return    this._convertBucketKeyToString(this._getBucketKey(id));
	//}

	/**
	 * Returns `true` if the given bucket key fits into the range `0 <= bucketKey < topology.bitLength`
	 *
	 * @method core.topology.RoutingTable~_isInBucketKeyRange
	 *
	 * @param {number} bucketKey
	 * @return {boolean}
	 */
	private _isInBucketKeyRange (bucketKey:number):boolean {
		return (0 <= bucketKey && bucketKey < this._getBucketAmount());
	}

}

export = RoutingTable;