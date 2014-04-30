/**
* @class topology.Bucket
*/
var Bucket = (function () {
    function Bucket(config, key, store) {
        /**
        * The internally used config object instance
        *
        * @private
        * @member {core.config.ConfigInterface} core.topology.Bucket#_config
        */
        this._config = null;
        /**
        * The Internally used bucket store instace
        *
        * @private
        * @member {core.topology.BucketStoreInterface} core.topology.Bucket#_store
        */
        this._store = null;
        /**
        * The Key of the bucket
        *
        * @private
        * @member {string} core.topology.Bucket#_key
        */
        this._key = '';
        this._config = config;
        this._key = key;
        this._store = store;

        this.open();
    }
    Bucket.prototype.add = function (contact) {
        return this._store.add(this._key, contact.getId(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());
    };

    Bucket.prototype.close = function () {
        this._store.close();
    };

    Bucket.prototype.contains = function (contact) {
        return this._store.contains(this._key, contact.getId());
    };

    Bucket.prototype.get = function (id) {
        return this._store.get(this._key, id);
    };

    Bucket.prototype.isOpen = function () {
        return this._store.isOpen();
    };

    Bucket.prototype.open = function () {
        this._store.open();
    };

    Bucket.prototype.remove = function (id) {
        return this._store.remove(this._key, id);
    };

    Bucket.prototype.size = function () {
        return this._store.size(this._key);
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
    return Bucket;
})();

module.exports = Bucket;
//# sourceMappingURL=Bucket.js.map
