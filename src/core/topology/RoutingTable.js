/**
* Created by joernroeder on 4/24/14.
*/
// http://www.sitepen.com/blog/2013/12/31/definitive-guide-to-typescript/
// https://github.com/felixge/node-style-guide
/// <reference path='RoutingTableInterface.d.ts' />
/// <reference path='../config/Config.d.ts' />
var BucketStore = require('./BucketStore');
var Bucket = require('./Bucket');

var JSONConfig = require('../config/Config').JSONConfig;

// just for testing
var Id = require('./Id');

/**
* @namespace topology
*/
var RoutingTable = (function () {
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
    function RoutingTable(config, id, store) {
        var _this = this;
        /**
        * @private
        */
        this._config = null;
        /**
        * @private
        * @member {topology.BucketStoreInterface} _store
        */
        this._store = null;
        /**
        *
        * @private
        * @member {topology.DistanceMetric} _id
        */
        this._id = null;
        /**
        *
        * @private
        * @member {Array.<topology.BucketInterface>} _buckets
        */
        this._buckets = {};
        /**
        *
        * @private
        * @member {boolean} _isOpen
        */
        this._isOpen = false;
        this._config = config;
        this._id = id;
        this._store = store;

        process.on('exit', function () {
            _this.close();
        });

        this.open();
    }
    /**
    * @private
    * @method topology.RoutingTable#_createBucket
    *
    * @param {string} index
    */
    RoutingTable.prototype._createBucket = function (index) {
        this._buckets[index] = new Bucket(config, index, this._store);
    };

    /**
    *
    * @private
    * @method topology.RoutingTable#_getBucketKey
    *
    * @param {topology.DistanceMetric} id
    * @return {string}
    */
    RoutingTable.prototype._getBucketKey = function (id) {
        var bucketKey = this._id.differsInHighestBit(id).toString();

        return bucketKey;
    };

    RoutingTable.prototype.getContactNode = function (id) {
        var bucketKey = this._getBucketKey(id);
        return this._buckets[bucketKey].get(id);
    };

    RoutingTable.prototype.updateLastSeen = function (contact) {
        contact.updateLastSeen();
        this.updateContactNode(contact);
    };

    RoutingTable.prototype.updateContactNode = function (contact) {
        var bucketKey = this._getBucketKey(contact.getId());
        this._buckets[bucketKey].update(contact);
    };

    RoutingTable.prototype.updateId = function (id) {
        return;
    };

    RoutingTable.prototype.open = function () {
        if (this._isOpen)
            return;

        this._buckets = {};

        for (var i = this._config.get('topology.k'); i--;) {
            this._createBucket(i.toString());
        }

        this._isOpen = true;
    };

    // todo check bucket.close() return value
    RoutingTable.prototype.close = function () {
        if (!this._isOpen)
            return;

        this._isOpen = false;

        for (var key in this._buckets) {
            this._buckets[key].close();
        }

        this._buckets = null;
    };

    RoutingTable.prototype.isOpen = function () {
        return this._isOpen;
    };
    return RoutingTable;
})();


// --- testing ---
var my = new Id(Id.byteBufferByBitString('000010010000000000001110000100101000000000100010', 6), 48);

// routing table construction
var config = new JSONConfig('../../config/mainConfig', ['topology']), databasePath = (function () {
    var path = config.get('topology.bucketStore.databasePath');

    return process.cwd() + '/' + path;
}()), bucketStore = new BucketStore('dbName', databasePath);

var rt = new RoutingTable(config, my, bucketStore);

// dummy data generator
var getContact = function (max) {
    var getRandomId = function () {
        var str = '';

        for (var i = max; i--;) {
            str += (Math.round(Math.random())).toString();
        }

        return str;
    }, id = getRandomId(), lastSeen = Date.now();

    return {
        getId: function () {
            return new Id(Id.byteBufferByBitString(id, 6), max);
        },
        getPublicKey: function () {
            return 'pk-123456';
        },
        getAddresses: function () {
            return "[{ip: '123', port: 80}, {ip: '456', port: 80}]";
        },
        getLastSeen: function () {
            return lastSeen;
        },
        updateLastSeen: function () {
            lastSeen = Date.now();
        }
    };
};

var contacts = [], amount = 10000;

for (var i = amount; i--;) {
    contacts[i] = getContact(48);
}

var t = Date.now();

for (var i = amount; i--;) {
    rt.updateContactNode(contacts[i]);
}
t = Date.now() - t;

console.log('added ' + amount + ' contacts in ' + t + ' ms');

//console.log(rt);
rt.close();
module.exports = RoutingTable;
//# sourceMappingURL=RoutingTable.js.map
