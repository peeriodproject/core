/**
 * @namespace config
 */

/**
 * The `ConfigInterface` provides a read-only key-value store for config values.
 * The keys should be namespaced via _dot.notation_ to prevent conflicts.
 *
 * @interface
 * @class config.ConfigInterface
 */
interface ConfigInterface {

	/**
	 * Returns the config value stored under the given key or a default value if provided.
	 *
	 * @abstract
	 * @method config.ConfigInterface#get
	 *
	 * @throws Will throw an error if no key is specified.
	 * @throws Will throw an error if no value is found and no alternative is specified.
	 *
	 * @param {string} key
	 * @param {any} alternative
	 * @returns {any}
	 */
	get(key:string, alternative?:any):any;
}

/**
 * A `ConfigPair` represents a single key-value combination.
 *
 * @interface
 * @class config.ConfigPair
 */
interface ConfigPair {
	[key:string]: Object;
}

/**
 * A `ConfigPairList` represents an array of @{link config.ConfigPair}.
 *
 * @interface
 * @class config.ConfigPairList
 */
interface ConfigPairList extends Array<ConfigPair> {}

/**
 * A `ConfigKeyList` represents an array of config keys.
 *
 * @interface
 * @class config.ConfigKeyList
 */
interface ConfigKeyList extends Array<string> {}