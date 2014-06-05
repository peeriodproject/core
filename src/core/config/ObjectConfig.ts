import ConfigInterface = require('./interfaces/ConfigInterface');
import ConfigKeyListInterface = require('./interfaces/ConfigKeyListInterface');
import ConfigPairInterface = require('./interfaces/ConfigPairInterface');
import ConfigPairListInterface = require('./interfaces/ConfigPairListInterface');

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
class ObjectConfig implements ConfigInterface {

	/**
	 * Holds the read-only data store object
	 *
	 * @member {core.config.ConfigPairListInterface} core.config.ObjectConfig~_data
	 */
	private _data:ConfigPairListInterface = [];

	constructor (configData:Object, configKeys:ConfigKeyListInterface = []) {
		// @see http://stackoverflow.com/a/11231664
		// underscore.js _.isObject
		if (configData !== Object(configData) || Array.isArray(configData)) {
			throw new Error('Config.constructor: The given configData is not an object.');
		}

		this._data = this._convertObjectToDotNotation(configData, configKeys);
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

		throw new Error('Config.get: No value for "' + key + '" found.');
	}

	/**
	 * The internal method to convert the object into the key-value store.
	 *
	 * @method core.config.JSONConfig~_convertToDotNotation
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
				var newKey:string = (current ? current + '.' + key : key);

				// it's a nested object, so do it again
				if (value && typeof value === 'object' && !Array.isArray(value)) {
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
	}

}

export = ObjectConfig;