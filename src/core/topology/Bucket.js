/**
* Created by joernroeder on 4/23/14.
*/
/// <reference path='BucketInterface.d.ts' />
/// <reference path='BucketStoreInterface.d.ts' />
/// <reference path='../config/Config.d.ts' />
var Id = require('./Id');

/**
* @namespace topology
*/
/**
* @class topology.Bucket
*/
var Bucket = (function () {
    function Bucket(config, key, store) {
        /**
        * @private
        */
        this._config = null;
        /**
        * @private
        */
        this._store = null;
        /**
        *
        * @private
        */
        this._key = '';
        /**
        *
        * @type {number}
        * @private
        */
        this._k = -1;
        this._config = config;
        this._key = key;
        this._store = store;

        this.open();
    }
    Bucket.prototype.add = function (contact) {
        return this._store.add(this._key, contact.getId(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());
    };

    Bucket.prototype.remove = function (id) {
        return this._store.remove(this._key, id);
    };

    Bucket.prototype.get = function (id) {
        return this._store.get(this._key, id);
    };

    Bucket.prototype.contains = function (contact) {
        return this._store.contains(this._key, contact.getId());
    };

    Bucket.prototype.update = function (contact) {
        if (this.contains(contact)) {
            // todo Benchmark: always replace vs. check nodeaddresses and update
            this.remove(contact.getId());
            this.add(contact);
        } else if (this.size() < this._config.get('topology.k')) {
            this.add(contact);
        } else {
            // todo ping pong
        }

        return false;
    };

    Bucket.prototype.size = function () {
        return this._store.size(this._key);
    };

    Bucket.prototype.close = function () {
        this._store.close();
    };

    Bucket.prototype.open = function () {
        this._store.open();
    };

    Bucket.prototype.isOpen = function () {
        return this._store.isOpen();
    };
    return Bucket;
})();

module.exports = Bucket;
//# sourceMappingURL=Bucket.js.map
