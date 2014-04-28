/// <reference path='Config.d.ts' />
/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* The class `ObjectConfig` converts a specified Javascript-Object into a dot.notated key-value store.
*
* @class config.ObjectConfig
* @implements config.ConfigInterface
*
* @param {Object} configData
* @param {config.ConfigKeyList} keys
*/
var ObjectConfig = (function () {
    /**
    * todo Error-Patterns http://www.nodewiz.biz/nodejs-error-handling-pattern/
    */
    function ObjectConfig(configData, keys) {
        if (typeof keys === "undefined") { keys = []; }
        /**
        * @private
        * @member {config.ConfigPairList} config.JSONConfig#_data
        */
        this._data = [];
        // @see http://stackoverflow.com/a/11231664
        // underscore.js _.isObject
        if (configData !== Object(configData) || Array.isArray(configData)) {
            throw new Error('Config.constructor: The given configData is not an object.');
        }

        this._data = this._convertObjectToDotNotation(configData, keys);
    }
    /**
    * @private
    * @method config.JSONConfig#_convertToDotNotation
    *
    * @param {Object} obj
    * @param {config.ConfigKeyList} configKeys
    * @returns {config.ConfigPairList} The dot-notated key-value object
    */
    ObjectConfig.prototype._convertObjectToDotNotation = function (obj, configKeys) {
        var res = {}, recurse = function (obj, configKeys, current) {
            for (var key in obj) {
                var value = obj[key], newKey = (current ? current + '.' + key : key);

                if (value && typeof value === 'object') {
                    recurse(value, configKeys, newKey); // it's a nested object, so do it again
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
    return ObjectConfig;
})();
exports.ObjectConfig = ObjectConfig;

/**
* The class `JSONConfig` loads a JSON-file and converts it into a dot.notated key-value store.
*
* @class config.JSONConfig
* @extends config.ObjectConfig
*
* todo add throw comment
*
* @param {string} configPath
* @param {config.ConfigKeyList} keys
*/
var JSONConfig = (function (_super) {
    __extends(JSONConfig, _super);
    function JSONConfig(configPath, keys) {
        if (typeof keys === "undefined") { keys = []; }
        var fileData = {};

        try  {
            if (configPath.indexOf('.json') === -1) {
                fileData = require(configPath + '.json');
            } else {
                fileData = require(configPath);
            }
        } catch (err) {
            if ('MODULE_NOT_FOUND' === err.code) {
                throw new Error('JSONConfig.constructor: Cannot find config file: "' + configPath + '"');
            } else if ('SyntaxError' === err.constructor.call().toString()) {
                throw new Error('JSONConfig.constructor: The file "' + configPath + '" is not a valid JSON-File.');
            } else {
                throw err;
            }
        }

        _super.call(this, fileData, keys);
    }
    return JSONConfig;
})(ObjectConfig);
exports.JSONConfig = JSONConfig;
//# sourceMappingURL=Config.js.map
