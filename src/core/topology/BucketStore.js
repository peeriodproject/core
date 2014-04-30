/// <reference path='interfaces/BucketStoreInterface.ts' />
/// <reference path='../../../ts-definitions/node-lmdb/node-lmdb.d.ts' />
var lmdb = require('node-lmdb');

/**
* LMDB-BucketStore Implementation
*
*/
var BucketStore = (function () {
    function BucketStore(name, path) {
        /**
        * The internal lmdb database instance
        *
        * @private
        * @member {lmdb.Dbi} core.topology.BucketStore#_dbi
        */
        this._dbi = null;
        /**
        * The internal lmdb database environment instance
        *
        * @private
        * @member {lmdb.Env} core.topology.BucketStore#_env
        */
        this._env = null;
        /**
        * Indicates wheather the store is open or closed
        *
        * @private
        * @member {boolean} core.topology.BucketStore#_isOpen
        */
        this._isOpen = false;
        /**
        * The name of the internal database
        *
        * @private
        * @member {boolean} core.topology.BucketStore#_name
        */
        this._name = '';
        /**
        * An absolute path where the database stores it's files
        *
        * @private
        * @member {boolean} core.topology.BucketStore#_path
        */
        this._path = '';
        this._name = name;
        this._path = path;

        this.open();
    }
    BucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses, publicKey) {
        var txn = this._beginTransaction();
        var added = this._add(txn, bucketKey, id, lastSeen, addresses, publicKey);

        txn.commit();

        return added;
    };

    BucketStore.prototype.addAll = function (bucketKey, contacts) {
        var txn = this._beginTransaction();
        var added = false;

        for (var i in contacts) {
            var contact = contacts[i];

            added = this._add(txn, bucketKey, contact.id, contact.lastSeen, contact.addresses, contact.publicKey);
        }

        txn.commit();

        return added;
    };

    BucketStore.prototype.close = function () {
        if (!this._isOpen) {
            return;
        }

        this._isOpen = false;

        this._dbi.close();
        this._dbi = null;

        this._env.close();
        this._env = null;
    };

    BucketStore.prototype.contains = function (bucketKey, id) {
        return (this.get(bucketKey, id) !== null);
    };

    BucketStore.prototype.debug = function () {
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);

        for (var found = cursor.goToFirst(); found; found = cursor.goToNext()) {
            cursor.getCurrentString(function (key, data) {
                console.log(key + "  " + data);
            });
        }

        cursor.close();
        txn.commit();
    };

    BucketStore.prototype.get = function (bucketKey, id) {
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);
        var value = txn.getString(this._dbi, this._getIdKey(id));

        cursor.close();
        txn.commit();

        return value;
    };

    BucketStore.prototype.isOpen = function () {
        return this._isOpen;
    };

    BucketStore.prototype.open = function () {
        if (this._isOpen)
            return;

        this._env = new lmdb.Env();
        this._env.open({
            //name: this._name,
            path: this._path
        });

        this._dbi = this._env.openDbi({
            name: this._name,
            create: true
        });

        this._isOpen = true;
    };

    BucketStore.prototype.remove = function (bucketKey, id) {
        // todo Typescript: propper return type (callback vs return)
        var contact = this.get(bucketKey, id);
        var lastSeen;
        var txn;

        if (contact === null) {
            return true;
        }

        lastSeen = JSON.parse(contact).lastSeen;

        txn = this._beginTransaction();

        // remove shortcut
        txn.del(this._dbi, this._getLastSeenKey(bucketKey, lastSeen));

        // remove object
        txn.del(this._dbi, this._getIdKey(id));
        txn.commit();

        return true;
    };

    BucketStore.prototype.size = function (bucketKey) {
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);
        var size = 0;

        bucketKey = this._getBucketKey(bucketKey);

        for (var found = cursor.goToRange(bucketKey); found; found = cursor.goToNext()) {
            // Stop the loop if the current key is no longer part of the bucket
            if (found.indexOf(bucketKey) !== 0) {
                break;
            }

            size++;
        }

        cursor.close();
        txn.commit();

        return size;
    };

    /**
    * Adds the given object within the specified transaction `txn` to the database
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_add
    *
    * @param {lmdb.Txn} txn
    * @param {string} bucketKey
    * @param {core.topology.IdInterface} id
    * @param {number} lastSeen
    * @param {any} addresses
    * @param {string} publicKey
    * @returns {boolean}
    */
    BucketStore.prototype._add = function (txn, bucketKey, id, lastSeen, addresses, publicKey) {
        var idKey = this._getIdKey(id);
        var lastSeenKey = this._getLastSeenKey(bucketKey, lastSeen);
        var value = {
            addresses: addresses,
            id: id,
            lastSeen: lastSeen,
            publicKey: publicKey
        };

        try  {
            // stores the object with id as it's key
            txn.putString(this._dbi, idKey, JSON.stringify(value));

            // stores a shortcut for bucketwide last seen searches.
            txn.putString(this._dbi, lastSeenKey, this._getIdValue(id));
        } catch (err) {
            console.error(err);
        }

        return true;
    };

    /**
    * Creates a read-only transaction object on the instance environment
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_beginReadOnlyTransaction
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._beginReadOnlyTransaction = function () {
        // todo replace with propper options
        var opts = {};

        opts['readOnly'] = true;

        return this._env.beginTxn(opts);
    };

    /**
    * Creates a writable transaction object on the instance environment
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_beginTransaction
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._beginTransaction = function () {
        // todo replace with propper options
        var opts = {};

        return this._env.beginTxn(opts);
    };

    /**
    * Creates a Cursor on the instace database
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_getCursor
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._getCursor = function (txn) {
        return new lmdb.Cursor(txn, this._dbi);
    };

    /**
    * Returns the internally used key for bucket wide searches
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_getBucketKey
    
    * @param {string} key
    * @returns {string}
    */
    BucketStore.prototype._getBucketKey = function (key) {
        return key + '-';
    };

    /**
    * Returns the internally used key for id related searches
    *
    * @private
    * @method {boolean} core.topology.BucketStore~_getIdKey
    
    * @param {string} id
    * @returns {string}
    */
    BucketStore.prototype._getIdKey = function (id) {
        return this._getIdValue(id);
    };

    /**
    * Returns the id as a formatted string
    *
    * @method {boolean} core.topology.BucketStore~_getIdValue
    *
    * @param {core.topology.IdInterface} id
    * @returns {string}
    */
    BucketStore.prototype._getIdValue = function (id) {
        return id.toBitString();
    };

    /**
    * Returns a {@link core.topology.BucketStore~getIdKey} prefixed key to store objects within the `bucketKey` namespace
    *
    * @method {boolean} core.topology.BucketStore~_getLastSeenKey
    *
    * @param {string} bucketKey
    * @param {number} lastSeen
    * @returns {string}
    */
    BucketStore.prototype._getLastSeenKey = function (bucketKey, lastSeen) {
        return this._getBucketKey(bucketKey) + lastSeen;
    };
    return BucketStore;
})();

module.exports = BucketStore;
//# sourceMappingURL=BucketStore.js.map
