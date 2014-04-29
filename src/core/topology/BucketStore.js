/**
* Created by joernroeder on 4/23/14.
*/
/// <reference path='BucketStoreInterface.d.ts' />
var lmdb = require('node-lmdb');

/**
* LMDB-BucketStore Implementation
*
* key format:
*/
var BucketStore = (function () {
    function BucketStore(name, path) {
        /**
        * @private
        */
        this._env = null;
        /**
        * @private
        */
        this._dbi = null;
        /**
        * @private
        */
        this._name = '';
        /**
        * @private
        */
        this._path = '';
        /**
        * Indicates wheather the store is open or closed
        *
        * @private
        */
        this._isOpen = false;
        this._name = name;
        this._path = path;

        this.open();

        var txn = this._beginTransaction();

        txn.putString(this._dbi, 'END', true);
        txn.commit();
    }
    BucketStore.prototype._getBucketKey = function (key) {
        return key + '-';
    };

    BucketStore.prototype._getIdValue = function (id) {
        return id.toBitString();
    };

    BucketStore.prototype._getIdKey = function (id) {
        return this._getIdValue(id);
    };

    BucketStore.prototype._getLastSeenKey = function (bucketKey, lastSeen) {
        return this._getBucketKey(bucketKey) + lastSeen;
    };

    BucketStore.prototype._beginTransaction = function () {
        // todo replace with propper options
        var opts = {};

        return this._env.beginTxn(opts);
    };

    BucketStore.prototype._beginReadOnlyTransaction = function () {
        // todo replace with propper options
        var opts = {};

        opts['readOnly'] = true;

        return this._env.beginTxn(opts);
    };

    BucketStore.prototype._getCursor = function (txn) {
        return new lmdb.Cursor(txn, this._dbi);
    };

    BucketStore.prototype.get = function (bucketKey, id) {
        var txn = this._beginReadOnlyTransaction(), cursor = this._getCursor(txn), value = txn.getString(this._dbi, this._getIdKey(id));

        cursor.close();
        txn.commit();

        return value;
    };

    BucketStore.prototype.remove = function (bucketKey, id) {
        var contact = this.get(bucketKey, id), lastSeen = 0;

        if (null === contact) {
            return true;
        }

        lastSeen = JSON.parse(contact).lastSeen;

        var txn = this._beginTransaction();

        // remove shortcut
        txn.del(this._dbi, this._getLastSeenKey(bucketKey, lastSeen));

        // remove object
        txn.del(this._dbi, this._getIdKey(id));
        txn.commit();

        return true;
    };

    BucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses, publicKey) {
        var txn = this._beginTransaction(), added = false;

        added = this._add(txn, bucketKey, id, lastSeen, addresses, publicKey);
        txn.commit();

        return added;
    };

    BucketStore.prototype.addAll = function (bucketKey, contacts) {
        var txn = this._beginTransaction(), added = false;

        for (var i in contacts) {
            var contact = contacts[i];

            added = this._add(txn, bucketKey, contact.id, contact.lastSeen, contact.addresses, contact.publicKey);
        }

        txn.commit();

        return added;
    };

    BucketStore.prototype._add = function (txn, bucketKey, id, lastSeen, addresses, publicKey) {
        var idKey = this._getIdKey(id), lastSeenKey = this._getLastSeenKey(bucketKey, lastSeen), value = {
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

    BucketStore.prototype.size = function (bucketKey) {
        var txn = this._beginReadOnlyTransaction(), cursor = this._getCursor(txn), shouldContinue = true, prevKey = '', size = 0;

        bucketKey = this._getBucketKey(bucketKey);

        try  {
            cursor.goToRange(bucketKey);

            while (shouldContinue) {
                cursor.getCurrentString(function (key, data) {
                    if (key.indexOf(bucketKey) !== 0 || prevKey === key) {
                        shouldContinue = false;
                    } else {
                        size++;
                    }

                    prevKey = key;
                });

                cursor.goToNext();
            }
        } catch (err) {
            console.log(err);
            // Error here only means that we've reached the end
        }

        cursor.close();
        txn.commit();

        return size;
    };

    BucketStore.prototype.contains = function (bucketKey, id) {
        return (null === this.get(bucketKey, id)) ? false : true;
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

    BucketStore.prototype.close = function () {
        if (!this._isOpen)
            return;

        this._isOpen = false;

        this._dbi.close();
        this._dbi = null;

        this._env.close();
        this._env = null;
    };

    BucketStore.prototype.isOpen = function () {
        return this._isOpen;
    };
    return BucketStore;
})();

module.exports = BucketStore;
//# sourceMappingURL=BucketStore.js.map
