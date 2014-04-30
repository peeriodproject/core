/**
* The class `ObjectConfig` converts a specified Javascript-Object into a dot.notated key-value store.
*
* @class core.config.ObjectConfig
* @implements core.config.ConfigInterface
*
* @param {Object} configData
* @param {core.config.ConfigKeyList} keys
*/
var ObjectConfig = (function () {
    function ObjectConfig(configData, keys) {
        if (typeof keys === "undefined") { keys = []; }
        /**
        * @private
        * @member {core.config.ConfigPairListInterface} config.JSONConfig#_data
        */
        this._data = [];
        // @see http://stackoverflow.com/a/11231664
        // underscore.js _.isObject
        if (configData !== Object(configData) || Array.isArray(configData)) {
            throw new Error('Config.constructor: The given configData is not an object.');
        }

        this._data = this._convertObjectToDotNotation(configData, keys);
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

        throw new Error('Config.get: no value for "' + key + '" found.');
    };

    /**
    * @private
    * @method core.config.JSONConfig#_convertToDotNotation
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
                if (value && typeof value === 'object') {
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
