var Bucket = require('./Bucket');

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
var RoutingTable = (function () {
    function RoutingTable(config, id, store) {
        var _this = this;
        /**
        * The internally used config object instance. Usually just for reference and passed through to the Bucket
        *
        * @private
        * @member {core.config.ConfigInterface} core.topology.RoutingTable#_config
        */
        this._config = null;
        /**
        * The internally used bucket store instance.
        *
        * @private
        * @member {core.topology.BucketStoreInterface} core.topology.RoutingTable#_store
        */
        this._store = null;
        /**
        * The Id of the node who owns the routing table
        *
        * @private
        * @member {core.topology.IdInterface} core.topology.RoutingTable#_id
        */
        this._id = null;
        /**
        * The internally used list of buckets
        *
        * @private
        * @member {Array.<topology.BucketInterface>} core.topology.RoutingTable#_buckets
        */
        this._buckets = {};
        /**
        * @private
        * @member {boolean} core.topology.RoutingTable#_isOpen
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
    * Creates a bucket with the given key.
    *
    * @private
    * @method topology.RoutingTable#_createBucket
    *
    * @param {string} key
    */
    RoutingTable.prototype._createBucket = function (key) {
        this._buckets[key] = new Bucket(this._config, key, this._store);
    };

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
    RoutingTable.prototype._getBucketKey = function (id) {
        return this._id.differsInHighestBit(id).toString();
    };

    // todo check bucket.close() return value
    RoutingTable.prototype.close = function () {
        if (!this._isOpen) {
            return;
        }

        this._isOpen = false;

        for (var key in this._buckets) {
            this._buckets[key].close();
        }

        this._buckets = null;
    };

    RoutingTable.prototype.getContactNode = function (id) {
        var bucketKey = this._getBucketKey(id);
        return this._buckets[bucketKey].get(id);
    };

    RoutingTable.prototype.isOpen = function () {
        return this._isOpen;
    };

    RoutingTable.prototype.open = function () {
        if (this._isOpen)
            return;

        this._buckets = {};

        for (var i = 0, k = this._config.get('topology.k'); i < k; i++) {
            this._createBucket(i.toString());
        }

        this._isOpen = true;
    };

    /*
    updateLastSeen(contact:ContactNodeInterface):void {
    contact.updateLastSeen();
    this.updateContactNode(contact);
    }*/
    RoutingTable.prototype.updateContactNode = function (contact) {
        var bucketKey = this._getBucketKey(contact.getId());
        this._buckets[bucketKey].update(contact);
    };

    RoutingTable.prototype.updateId = function (id) {
        return;
    };
    return RoutingTable;
})();

module.exports = RoutingTable;
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
//# sourceMappingURL=RoutingTable.js.map
