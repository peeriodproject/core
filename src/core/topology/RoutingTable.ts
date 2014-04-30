import RoutingTableInterface = require('./interfaces/RoutingTableInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import BucketInterface = require('./interfaces/BucketInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import IdInterface = require('./interfaces/IdInterface');

import BucketStore = require('./BucketStore');
import Bucket = require('./Bucket');

import JSONConfig = require('../config/JSONConfig');

// just for testing
//import Id = require('./Id');

/**
 * Creates a routing table with the given number of k-buckets
 *
 * @class topology.RoutingTable
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
	 * @member {boolean} _isOpen
	 */
	private _isOpen:boolean = false;

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

	constructor (config:ConfigInterface, id:IdInterface, store:BucketStoreInterface) {
		this._config = config;
		this._id = id;
		this._store = store;

		process.on('exit', () => {
			this.close();
		});

		this.open();
	}

	// todo check bucket.close() return value
	close ():void {
		if (!this._isOpen) {
			return;
		}

		this._isOpen = false;

		for (var key in this._buckets) {
			this._buckets[key].close();
		}

		this._buckets = null;
	}

	getContactNode (id:IdInterface):any {
		var bucketKey = this._getBucketKey(id);
		return this._buckets[bucketKey].get(id);
	}

	isOpen ():boolean {
		return this._isOpen;
	}

	open ():void {
		if (this._isOpen) return;

		this._buckets = {};

		for (var i = 0, k = this._config.get('topology.k'); i < k; i++) {
			this._createBucket(i.toString());
		}

		this._isOpen = true;
	}

	/*
	 updateLastSeen(contact:ContactNodeInterface):void {
	 contact.updateLastSeen();
	 this.updateContactNode(contact);
	 }*/

	updateContactNode (contact:ContactNodeInterface):void {
		var bucketKey:string = this._getBucketKey(contact.getId());
		this._buckets[bucketKey].update(contact);
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