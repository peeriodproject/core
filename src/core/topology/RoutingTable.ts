import RoutingTableInterface = require('./interfaces/RoutingTableInterface');
import RoutingTableOptions = require('./interfaces/RoutingTableOptions');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import BucketInterface = require('./interfaces/BucketInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import IdInterface = require('./interfaces/IdInterface');

import ObjectUtils = require('../utils/ObjectUtils');

import BucketStore = require('./BucketStore');
import Bucket = require('./Bucket');

import JSONConfig = require('../config/JSONConfig');

// just for testing
//import Id = require('./Id');

/**
 * Creates a routing table with the given number of k-buckets
 *
 * @class core.topology.RoutingTable
 * @implements RoutingTableInterface
 *
 * @param {config.ConfigInterface} config
 * @param {topology.IdInterface} id
 * @param {topology.BucketStoreInterface} store
 */
class RoutingTable implements RoutingTableInterface {

	/**
	 * The internally used config object instance. Usually just for reference and passed through to the Bucket
	 *
	 * @private
	 * @member {core.config.ConfigInterface} core.topology.RoutingTable#_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The internally used bucket store instance.
	 *
	 * @private
	 * @member {core.topology.BucketStoreInterface} core.topology.RoutingTable#_store
	 */
	private _store:BucketStoreInterface = null;

	/**
	 * The Id of the node who owns the routing table
	 *
	 * @private
	 * @member {core.topology.IdInterface} core.topology.RoutingTable#_id
	 */
	private _id:IdInterface = null;

	/**
	 * The internally used list of buckets
	 *
	 * @private
	 * @member {Array.<topology.BucketInterface>} core.topology.RoutingTable#_buckets
	 */
	private _buckets:{[key:string]: BucketInterface} = {};

	/**
	 * @private
	 * @member {boolean} core.topology.RoutingTable#_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 *
	 * @private
	 * @member {core.topology.RoutingTableOptions} core.topology.RoutingTable~_options
	 */
	private _options:RoutingTableOptions = null;

	/**
	 * Creates a bucket with the given key.
	 *
	 * @private
	 * @method topology.RoutingTable#_createBucket
	 *
	 * @param {string} key
	 */
	private _createBucket (key:string) {
		this._buckets[key] = new Bucket(this._config, key, this._store);
	}

	/**
	 * Returns the bucket key where the given id should be stored.
	 * See {@link core.topology.Id.differsInHighestBit} for more information.
	 *
	 * @private
	 * @method topology.RoutingTable#_getBucketKey
	 *
	 * @param {topology.IdInterface} id
	 * @return {string}
	 */
	private _getBucketKey (id:IdInterface):string {
		return this._id.differsInHighestBit(id).toString();
	}

	// todo opts.onOpen, opts.onClose, closeOnProcessExit:true
	constructor (config:ConfigInterface, id:IdInterface, store:BucketStoreInterface, options:RoutingTableOptions) {
		var defaults:RoutingTableOptions = {
			closeOnProcessExit: true,
			onCloseCallback: function (err:Error) {},
			onOpenCallback: function (err:Error) {}
		};

		this._config = config;
		this._id = id;
		this._store = store;

		// todo merge opts & defaults
		console.log(ObjectUtils.extend(defaults, options));

		this._options = defaults;

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	// todo check bucket.close() return value
	close (callback?:(err:Error) => any):void {
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

	getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error) {};
		var bucketKey = this._getBucketKey(id);

		this._buckets[bucketKey].get(id, internalCallback);
	}

	isOpen (callback:(err:Error, isOpen:boolean) => any):boolean {
		return callback(null, this._isOpen);
	}

	open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return internalCallback(null);
		}

		this._buckets = {};

		for (var i = 0, k = this._config.get('topology.k'); i < k; i++) {
			this._createBucket(i.toString());
		}

		this._isOpen = true;
		internalCallback(null);
	}

	/*
	 updateLastSeen(contact:ContactNodeInterface):void {
	 contact.updateLastSeen();
	 this.updateContactNode(contact);
	 }*/

	updateContactNode (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};
		var bucketKey:string = this._getBucketKey(contact.getId());

		this._buckets[bucketKey].update(contact, internalCallback);
	}

	updateId (id:IdInterface):void {
		return;
	}

}

export = RoutingTable;
/*
// --- testing ---

var my = new Id(Id.byteBufferByBitString('000010010000000000001110000100101000000000100010', 6), 48);

// routing table construction
var config = new JSONConfig('../../config/mainConfig', ['topology']),
	databasePath = (function () {
		var path = config.get('topology.bucketStore.databasePath');

		return process.cwd() + '/' + path;
	}()),
	bucketStore = new BucketStore('dbName', databasePath);

var rt = new RoutingTable(config, my, bucketStore);

// dummy data generator
var getContact = function (max):ContactNodeInterface {
	var getRandomId = function ():string {
			var str = '';

			for (var i = max; i--;) {
				str += (Math.round(Math.random())).toString();
			}

			return str;
		},

		id = getRandomId(),
		lastSeen = Date.now();

	return {
		getId: function ():IdInterface {
			return new Id(Id.byteBufferByBitString(id, 6), max);
		},

		getPublicKey: function ():string {
			return 'pk-123456';
		},

		getAddresses: function ():string {
			return "[{ip: '123', port: 80}, {ip: '456', port: 80}]";
		},

		getLastSeen: function ():number {
			return lastSeen;
		},

		updateLastSeen: function ():void {
			lastSeen = Date.now();
		}
	};
};

var contacts = [],
	amount = 10000;

// generate contacts
for (var i = amount; i--;) {
	contacts[i] = getContact(48);
}

var t = Date.now();
// push them to the db
for (var i = amount; i--;) {
	rt.updateContactNode(contacts[i]);
}
t = Date.now() - t;

console.log('added ' + amount + ' contacts in ' + t + ' ms');

//console.log(rt);
rt.close();*/

// https://github.com/mikejihbe/metrics
// https://github.com/felixge/node-measured
// http://blog.3rd-eden.com/post/5809079469/theoretical-node-js-real-time-performance
// http://gigaom.com/2012/11/07/nodefly-goal-better-app-performance-monitoring-for-node-js/