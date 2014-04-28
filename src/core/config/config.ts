/// <reference path='Config.d.ts' />
/// <reference path='../../../ts-definitions/node/node.d.ts' />

/**
 * The class `JSONConfig` loads a JSON-file and converts it into a dot.notated key-value store.
 *
 * @class config.JSONConfig
 * @implements config.ConfigInterface
 *
 * @param {string} configPath
 * @param {config.ConfigKeyList} keys
 */
export class JSONConfig implements ConfigInterface {

	/**
	 * @private
	 * @member {config.ConfigPairList} config.JSONConfig#_data
	 */
	_data:ConfigPairList = [];

	/**
	 * @private
	 * @method config.JSONConfig#_convertToDotNotation
	 *
	 * @param {Object} obj
	 * @param {config.ConfigKeyList} configKeys
	 * @returns {config.ConfigPairList} The dot-notated key-value object
	 */
	private _convertToDotNotation(obj:Object, configKeys?:ConfigKeyList):ConfigPairList {
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

	constructor(configPath:string, keys:ConfigKeyList = []) {
		if (configPath.indexOf('.json') === -1) {
			configPath += '.json';
		}

		var fileData = require(configPath);

		this._data = this._convertToDotNotation(fileData, keys);
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

		throw new Error('Config: no value for "' + key + '" found.');
	}
}