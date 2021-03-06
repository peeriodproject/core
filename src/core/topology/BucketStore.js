/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/node-lmdb/node-lmdb.d.ts' />
var fs = require('fs');
var path = require('path');

var lmdb = require('node-lmdb');

/**
* LMDB-BucketStore Implementation
*
* @class core.topology.BucketStore
* @implements core.topology.BucketStoreInterface
*/
var BucketStore = (function () {
    function BucketStore(name, path) {
        /**
        * The internal lmdb database instance
        *
        * @member {lmdb.Dbi} core.topology.BucketStore~_databaseInstance
        */
        this._databaseInstance = null;
        /**
        * The internal lmdb database environment instance
        *
        * @member {lmdb.Env} core.topology.BucketStore~_databaseEnvironment
        */
        this._databaseEnvironment = null;
        /**
        * Indicates whether the store is open or closed
        *
        * @member {boolean} core.topology.BucketStore~_isOpen
        */
        this._isOpen = false;
        /**
        * The name of the internal database
        *
        * @member {boolean} core.topology.BucketStore~_name
        */
        this._name = '';
        /**
        * An absolute path where the database stores its files
        *
        * @member {boolean} core.topology.BucketStore~_path
        */
        this._path = '';
        this._name = name;
        this._path = path;

        this.open();
    }
    BucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses) {
        var txn = this._beginTransaction();
        var added = this._add(txn, bucketKey, id, lastSeen, addresses);

        txn.commit();
        txn = null;

        return added;
    };

    // todo remove depencency to ContactNodeInterface and use keyed objects instead
    BucketStore.prototype.addAll = function (bucketKey, contacts) {
        var txn = this._beginTransaction();
        var added = false;

        for (var i = 0, l = contacts.length; i < l; i++) {
            var contact = contacts[i];

            added = this._add(txn, bucketKey, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        }

        txn.commit();
        txn = null;

        return added;
    };

    BucketStore.prototype.close = function () {
        if (!this._isOpen) {
            return;
        }

        this._isOpen = false;

        this._databaseInstance.close();
        this._databaseInstance = null;

        this._databaseEnvironment.close();
        this._databaseEnvironment = null;
    };

    BucketStore.prototype.contains = function (bucketKey, id) {
        return (this.get(bucketKey, id) !== null);
    };

    BucketStore.prototype.get = function (bucketKey, id) {
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);
        var value = this._get(txn, id);

        cursor.close();
        txn.commit();
        cursor = null;
        txn = null;

        return value;
    };

    BucketStore.prototype.getAll = function (bucketKey) {
        var _this = this;
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);
        var bucketKeyShortcut = this._getBucketKey(bucketKey);
        var values = [];

        for (var found = cursor.goToRange(bucketKeyShortcut); found; found = cursor.goToNext()) {
            // Stop the loop if the current key is no longer part of the bucket
            if (found.indexOf(bucketKeyShortcut) !== 0) {
                break;
            }

            cursor.getCurrentBinary(function (key, idBuffer) {
                var contact = _this._get(txn, idBuffer);
                values.push(contact);
            });
        }

        cursor.close();
        txn.commit();
        cursor = null;
        txn = null;

        return values;
    };

    BucketStore.prototype.getLongestNotSeen = function (bucketKey) {
        var txn = this._beginReadOnlyTransaction();
        var cursor = this._getCursor(txn);
        var bucketKeyShortcut = this._getBucketKey(bucketKey);
        var lastSeenId = null;
        var contact = null;

        var found = cursor.goToRange(bucketKeyShortcut);

        if (found.indexOf(bucketKeyShortcut) === 0) {
            cursor.getCurrentBinary(function (key, idBuffer) {
                lastSeenId = idBuffer;
            });

            contact = this._get(txn, lastSeenId);
        }

        cursor.close();
        txn.commit();
        cursor = null;
        txn = null;

        return contact;
    };

    BucketStore.prototype.getRandom = function (bucketKey) {
        var all = this.getAll(bucketKey);
        var randomIndex = Math.round(Math.random() * (all.length - 1));

        return randomIndex > -1 ? all[randomIndex] : null;
    };

    BucketStore.prototype.isOpen = function () {
        return this._isOpen;
    };

    BucketStore.prototype.open = function () {
        if (this._isOpen)
            return;

        this._checkAndOpenDatabaseEnvironment();

        /*this._databaseEnvironment.open({
        //name: this._name,
        path: this._path
        //mapSize: 2*1024*1024*1024, // maximum database size
        //maxDbs: 3
        });*/
        this._databaseInstance = this._databaseEnvironment.openDbi({
            name: this._name,
            create: true
        });

        this._isOpen = true;
    };

    BucketStore.prototype.remove = function (bucketKey, id) {
        var contact = this.get(bucketKey, id);
        var lastSeen;
        var txn;

        if (contact === null) {
            return true;
        }

        lastSeen = contact.lastSeen;

        txn = this._beginTransaction();
        try  {
            // remove shortcut
            txn.del(this._databaseInstance, this._getLastSeenKey(bucketKey, lastSeen));
        } catch (e) {
            console.error(e);
        }

        try  {
            // remove object
            txn.del(this._databaseInstance, this._getIdKey(id));
        } catch (e) {
            console.error(e);
        }

        txn.commit();
        txn = null;

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
        cursor = null;
        txn = null;

        return size;
    };

    /**
    * Adds the given object within the specified transaction `txn` to the database
    *
    * @method core.topology.BucketStore~_add
    *
    * @param {lmdb.Txn} txn
    * @param {string} bucketKey
    * @param {Buffer} id
    * @param {number} lastSeen
    * @param {any} addresses
    * @returns {boolean}
    */
    BucketStore.prototype._add = function (txn, bucketKey, id, lastSeen, addresses) {
        var idKey = this._getIdKey(id);
        var lastSeenKey = this._getLastSeenKey(bucketKey, lastSeen);
        var value = {
            addresses: addresses,
            id: id,
            lastSeen: lastSeen
        };

        try  {
            // stores the object with id as it's key
            /*
            // multi row test
            txn.putBinary(this._databaseInstance, this._getPropertyKey(id, 'id'), id);
            txn.putNumber(this._databaseInstance, this._getPropertyKey(id, 'lastSeen'), lastSeen);
            txn.putString(this._databaseInstance, this._getPropertyKey(id, 'addresses'), JSON.stringify(addresses));
            */
            txn.putString(this._databaseInstance, idKey, JSON.stringify(value));

            // stores a shortcut for bucketwide last seen searches.
            // node-lmdb uses the old (slow buffer)! Therefore we're using much faster strings at the moment.
            txn.putBinary(this._databaseInstance, lastSeenKey, id);
            //txn.putString(this._databaseInstance, lastSeenKey, id.toJSON());
        } catch (err) {
            console.error(err);
        }

        value = null;

        return true;
    };

    /**
    * Creates a read-only transaction object on the instance environment
    *
    * @method core.topology.BucketStore~_beginReadOnlyTransaction
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._beginReadOnlyTransaction = function () {
        // todo replace with propper options
        var opts = {
            readOnly: true
        };

        return this._databaseEnvironment.beginTxn(opts);
    };

    /**
    * Creates a writable transaction object on the instance environment
    *
    * @method core.topology.BucketStore~_beginTransaction
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._beginTransaction = function () {
        // todo replace with propper options
        var opts = {};

        return this._databaseEnvironment.beginTxn(opts);
    };

    /**
    * Opens the database and handles environment architecture changes by cleaning up the old bucket store.
    *
    * @method core.topology.BucketStore~_checkAndOpenDatabaseEnvironment
    */
    BucketStore.prototype._checkAndOpenDatabaseEnvironment = function () {
        var _this = this;
        var openDatabase = function () {
            _this._databaseEnvironment = new lmdb.Env();
            _this._databaseEnvironment.open({
                //name: this._name,
                path: _this._path
            });
        };

        try  {
            openDatabase();
        } catch (e) {
            var dbPath = path.join(this._path, 'data.mdb');
            var lockPath = path.join(this._path, 'lock.mdb');

            this._databaseEnvironment = null;

            if (e.message === 'MDB_INVALID: File is not an MDB file') {
                fs.unlinkSync(dbPath);

                if (fs.existsSync(lockPath)) {
                    fs.unlinkSync(lockPath);
                }

                return openDatabase();
            }

            throw e;
        }
    };

    /**
    *
    * @method core.topology.BucketStore~_get
    *
    * @param {lmdb.Txn} txn
    * @param {Buffer} id
    * @returns {any}
    */
    BucketStore.prototype._get = function (txn, id) {
        /*
        multi row test
        var contact = {
        addresses: JSON.parse(txn.getString(this._databaseInstance, this._getPropertyKey(id, 'addresses'))),
        id: txn.getBinary(this._databaseInstance, this._getPropertyKey(id, 'id')),
        lastSeen: txn.getNumber(this._databaseInstance, this._getPropertyKey(id, 'lastSeen'))
        };
        
        return contact;*/
        return JSON.parse(txn.getString(this._databaseInstance, this._getIdKey(id)));
    };

    /**
    * Creates a Cursor on the database instance
    *
    * @method core.topology.BucketStore~_getCursor
    *
    * @returns {lmdb.Txn}
    */
    BucketStore.prototype._getCursor = function (txn) {
        return new lmdb.Cursor(txn, this._databaseInstance);
    };

    /**
    * Returns the internally used key for bucket wide searches
    *
    * @method core.topology.BucketStore~_getBucketKey
    
    * @param {string} key
    * @returns {string}
    */
    BucketStore.prototype._getBucketKey = function (key) {
        return key + '-';
    };

    /**
    * Returns the internally used key for id related searches
    *
    * @method core.topology.BucketStore~_getIdKey
    
    * @param {Buffer} id
    * @returns {string}
    */
    BucketStore.prototype._getIdKey = function (id) {
        return this._getIdValue(id);
    };

    /**
    * Returns the id as a formatted string
    *
    * @method core.topology.BucketStore~_getIdValue
    *
    * @param {Buffer} id
    * @returns {string}
    */
    BucketStore.prototype._getIdValue = function (id) {
        return id.toString('hex');
    };

    /**
    * Returns a {@link core.topology.BucketStore#_getIdKey} prefixed key to store objects within the `bucketKey` namespace
    *
    * @method core.topology.BucketStore#_getLastSeenKey
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
