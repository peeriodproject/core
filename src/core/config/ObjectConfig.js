/**
* The class `ObjectConfig` converts a specified Javascript-Object into a dot-notated key-value store.
* The store-object an be limited to the namespaces specified within the `configKeys` parameter.
*
* @example
*   var obj = {
*     foo: {
*       bar: 'foobar',
*       foo: 'foofoo'
*     },
*     bar: {
*       foo: 'barfoo'
*     }
*   };
*
*   // config is limited to the `foo` namespace
*   var config = new ObjectConfig(obj, ['foo']);
*
*   // get values
*   var bar = config.get('foo.bar'); // foobar
*   var foo = config.get('foo.foo'); // foofoo
*
*   // will throw a `No value for "bar.foo" found.`-Error
*   var barFoo = config.get('bar.foo');
*
* @class core.config.ObjectConfig
* @implements core.config.ConfigInterface
*
* @param {Object} configData The data-object to store
* @param {core.config.ConfigKeyListInterface} configKeys An array of namespace keys to limit the store
*/
var ObjectConfig = (function () {
    function ObjectConfig(configData, configKeys) {
        if (typeof configKeys === "undefined") { configKeys = []; }
        /**
        * Holds the read-only data store object
        *
        * @member {core.config.ConfigPairListInterface} core.config.ObjectConfig~_data
        */
        this._data = [];
        // @see http://stackoverflow.com/a/11231664
        // underscore.js _.isObject
        if (configData !== Object(configData) || Array.isArray(configData)) {
            throw new Error('Config.constructor: The given configData is not an object.');
        }

        this._data = this._convertObjectToDotNotation(configData, configKeys);
    }
    ObjectConfig.prototype.get = function (key, alternative) {
        if (!key) {
            throw new Error('Config.get: No config key given.');
        }

        key = key.toLowerCase();

        if (this._data[key] !== undefined) {
            return this._data[key];
        } else if (alternative !== undefined) {
            return alternative;
        }

        throw new Error('Config.get: No value for "' + key + '" found.');
    };

    /**
    * The internal method to convert the object into the key-value store.
    *
    * @method core.config.JSONConfig~_convertToDotNotation
    *
    * @param {Object} obj
    * @param {core.config.ConfigKeyListInterface} configKeys
    * @returns {core.config.ConfigPairListInterface} The dot-notated key-value object
    */
    ObjectConfig.prototype._convertObjectToDotNotation = function (obj, configKeys) {
        var res = {};
        var recurse = function (obj, configKeys, current) {
            for (var key in obj) {
                var value = obj[key];

                // joined key with dot
                var newKey = (current ? current + '.' + key : key);

                // it's a nested object, so do it again
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    recurse(value, configKeys, newKey);
                } else if (configKeys.length) {
                    for (var i in configKeys) {
                        // the key starts with the given config key, so add the property
                        if (newKey.indexOf(configKeys[i]) === 0) {
                            res[newKey.toLowerCase()] = value;
                            break;
                        }
                    }
                } else {
                    if (Array.isArray(value)) {
                        for (var j in value) {
                            if (typeof value[j] === 'object') {
                                throw new Error('Config~_convertObjectToDotNotation: Arrays can only contain primitives.');
                            }
                        }
                    }

                    res[newKey] = value;
                }
            }
        };

        recurse(obj, configKeys);

        return Object.freeze(res);
    };
    return ObjectConfig;
})();

module.exports = ObjectConfig;
//# sourceMappingURL=ObjectConfig.js.map
