/// <reference path='Config.d.ts' />
/// <reference path='../../../ts-definitions/node/node.d.ts' />

/**
 * The class `ObjectConfig` converts a specified Javascript-Object into a dot.notated key-value store.
 *
 * @class config.ObjectConfig
 * @implements config.ConfigInterface
 *
 * @param {Object} configData
 * @param {config.ConfigKeyList} keys
 */
export class ObjectConfig implements ConfigInterface {

	/**
	 * @private
	 * @member {config.ConfigPairList} config.JSONConfig#_data
	 */
	private _data:ConfigPairList = [];

	/**
	 * @private
	 * @method config.JSONConfig#_convertToDotNotation
	 *
	 * @param {Object} obj
	 * @param {config.ConfigKeyList} configKeys
	 * @returns {config.ConfigPairList} The dot-notated key-value object
	 */
	private _convertObjectToDotNotation(obj:Object, configKeys?:ConfigKeyList):ConfigPairList {
		var res = {},
			/** @link stackoverflow */
			recurse = function (obj:Object, configKeys:ConfigKeyList, current?:string) {

				for (var key in obj) {
					var value = obj[key],
						newKey = (current ? current + '.' + key : key);  // joined key with dot

					if (value && typeof value === 'object') {
						recurse(value, configKeys, newKey);  // it's a nested object, so do it again
					}
					else if (configKeys.length) {
						for (var i in configKeys) {
							// the key starts with the given config key, so add the property
							if (newKey.indexOf(configKeys[i]) === 0) {
								res[newKey.toLowerCase()] = value;
								break;
							}
						}
					}
					// it's not an object, so set the property
					else {
						res[newKey] = value;
					}
				}
			};

		recurse(obj, configKeys);

		return Object.freeze(res);
	}

	/**
	 * todo Error-Patterns http://www.nodewiz.biz/nodejs-error-handling-pattern/
	 */
	constructor(configData:Object, keys:ConfigKeyList = []) {
		// @see http://stackoverflow.com/a/11231664
		// underscore.js _.isObject
		if (configData !== Object(configData) || Array.isArray(configData)) {
			throw new Error('Config.constructor: The given configData is not an object.');
		}

		this._data = this._convertObjectToDotNotation(configData, keys);
	}

	get(key:string, alternative?:any):any {
		if (!key) {
			throw new Error('Config.get: No config key given.');
		}

		key = key.toLowerCase();

		if (this._data[key] !== undefined) {
			return this._data[key];
		}
		else if (alternative !== undefined) {
			return alternative;
		}

		throw new Error('Config.get: no value for "' + key + '" found.');
	}
}

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
export class JSONConfig extends ObjectConfig {

	constructor(configPath:string, keys:ConfigKeyList = []) {
		var fileData = {};

		try {
			if (configPath.indexOf('.json') === -1) {
				fileData = require(configPath + '.json');
			}
			else {
				fileData = require(configPath);
			}
		}
		catch (err) {
			if ('MODULE_NOT_FOUND' === err.code) {
				throw new Error('JSONConfig.constructor: Cannot find config file: "' + configPath + '"');
			}
			else if ('SyntaxError' === err.constructor.call().toString()) {
				throw new Error('JSONConfig.constructor: The file "' + configPath + '" is not a valid JSON-File.');
			}
			else {
				throw err;
			}
		}

		super(fileData, keys);
	}

}