/**
 * The `ConfigInterface` provides a read-only key-value store for config values.
 * The keys should be namespaced via _dot.notation_ to prevent conflicts.
 *
 * @interface
 * @class core.config.ConfigInterface
 */
interface ConfigInterface {

	/**
	 * Returns the config value stored under the given key or a default value if provided.
	 *
	 * @abstract
	 * @method core.config.ConfigInterface#get
	 *
	 * @throws Will throw an error if no key is specified.
	 * @throws Will throw an error if no value is found and no alternative is specified.
	 *
	 * @param {string} key
	 * @param {any} alternative
	 * @returns {any}
	 */
	get (key:string, alternative?:any):any;

}

export = ConfigInterface;