/**
 * Created by joernroeder on 4/24/14.
 */

// http://www.sitepen.com/blog/2013/12/31/definitive-guide-to-typescript/
// https://github.com/felixge/node-style-guide

/// <reference path='RoutingTableInterface.d.ts' />
/// <reference path='../config/Config.d.ts' />

import BucketStore = require('./BucketStore');
import Bucket = require('./Bucket');

var JSONConfig = require('../config/Config').JSONConfig;

// just for testing
import Id = require('./Id');


/**
 * @namespace topology
 */
class RoutingTable implements RoutingTableInterface {

	/**
	 * @private
	 */
	private _config:ConfigInterface = null;

	/**
	 * @private
	 * @member {topology.BucketStoreInterface} _store
	 */
	private _store:BucketStoreInterface = null;

	/**
	 *
	 * @private
	 * @member {topology.DistanceMetric} _id
	 */
	private _id:DistanceMetric = null;

	/**
	 *
	 * @private
	 * @member {Array.<topology.BucketInterface>} _buckets
	 */
	private _buckets:{[key:string]: BucketInterface} = {};

	/**
	 *
	 * @private
	 * @member {boolean} _isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * @private
	 * @method topology.RoutingTable#_createBucket
	 *
	 * @param {string} index
	 */
	private _createBucket(index:string) {
		this._buckets[index] = new Bucket(config, index, this._store);
	}

	/**
	 *
	 * @private
	 * @method topology.RoutingTable#_getBucketKey
	 *
	 * @param {topology.DistanceMetric} id
	 * @return {string}
	 */
	private _getBucketKey(id:DistanceMetric):string {
		var bucketKey = this._id.differsInHighestBit(id).toString();

		return bucketKey;
	}

	/**
	 * Creates a routing table with the given number of k-buckets
	 *
	 * @class topology.RoutingTable
	 * @implements RoutingTableInterface
	 *
	 * @param {config.ConfigInterface} config
	 * @param {topology.DistanceMetric} id
	 * @param {topology.BucketStoreInterface} store
	 */
	constructor(config:ConfigInterface, id:DistanceMetric, store:BucketStoreInterface) {
		this._config = config;
		this._id = id;
		this._store = store;

		process.on('exit', () => {
			this.close();
		});

		this.open();
	}

	getContactNode(id:DistanceMetric):any {
		var bucketKey = this._getBucketKey(id);
		return this._buckets[bucketKey].get(id);
	}

	updateLastSeen(contact:ContactNodeInterface):void {
		contact.updateLastSeen();
		this.updateContactNode(contact);
	}

	updateContactNode(contact:ContactNodeInterface):void {
		var bucketKey = this._getBucketKey(contact.getId());
		this._buckets[bucketKey].update(contact);
	}

	updateId(id:DistanceMetric):void {
		return;
	}

	open():void {
		if (this._isOpen) return;

		this._buckets = {};

		for (var i = this._config.get('topology.k'); i--;) {
			this._createBucket(i.toString());
		}

		this._isOpen = true;
	}

	// todo check bucket.close() return value
	close():void {
		if (!this._isOpen) return;

		this._isOpen = false;

		for (var key in this._buckets) {
			this._buckets[key].close();
		}

		this._buckets = null;
	}

	isOpen():boolean {
		return this._isOpen;
	}

}

export = RoutingTable;

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
		getId: function ():DistanceMetric {
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
rt.close();