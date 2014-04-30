import ConfigInterface = require('./interfaces/ConfigInterface');
import ConfigKeyListInterface = require('./interfaces/ConfigKeyListInterface');
import ConfigPairInterface = require('./interfaces/ConfigPairInterface');
import ConfigPairListInterface = require('./interfaces/ConfigPairListInterface');

/**
 * The class `ObjectConfig` converts a specified Javascript-Object into a dot.notated key-value store.
 *
 * @class core.config.ObjectConfig
 * @implements core.config.ConfigInterface
 *
 * @param {Object} configData
 * @param {core.config.ConfigKeyList} keys
 */
class ObjectConfig implements ConfigInterface {

	/**
	 * @private
	 * @member {core.config.ConfigPairListInterface} config.JSONConfig#_data
	 */
	private _data:ConfigPairListInterface = [];

	constructor (configData:Object, keys:ConfigKeyListInterface = []) {
		// @see http://stackoverflow.com/a/11231664
		// underscore.js _.isObject
		if (configData !== Object(configData) || Array.isArray(configData)) {
			throw new Error('Config.constructor: The given configData is not an object.');
		}

		this._data = this._convertObjectToDotNotation(configData, keys);
	}

	public get (key:string, alternative?:any):any {
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

	/**
	 * @private
	 * @method core.config.JSONConfig#_convertToDotNotation
	 *
	 * @param {Object} obj
	 * @param {core.config.ConfigKeyListInterface} configKeys
	 * @returns {core.config.ConfigPairListInterface} The dot-notated key-value object
	 */
	private _convertObjectToDotNotation (obj:Object, configKeys?:ConfigKeyListInterface):ConfigPairListInterface {
		var res:ConfigPairInterface = {};
		var recurse:Function = function (obj:Object, configKeys:ConfigKeyListInterface, current?:string):void {

			for (var key in obj) {
				var value:any = obj[key];
				// joined key with dot
				var	newKey:string = (current ? current + '.' + key : key);

				// it's a nested object, so do it again
				if (value && typeof value === 'object') {
					recurse(value, configKeys, newKey);
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

}

export = ObjectConfig;