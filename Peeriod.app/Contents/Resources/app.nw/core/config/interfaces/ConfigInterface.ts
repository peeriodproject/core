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
	 * @method core.config.ConfigInterface#get
	 *
	 * @throws Will throw an error if no key is specified.
	 * @throws Will throw an error if no value is found and no alternative is specified.
	 * @throws Will throw an error if an array contains a non pimitive object.
	 *
	 * @param {string} key The dot-notated object key
	 * @param {any} alternative An alternative (default) value if no value is specified for the given key
	 * @returns {any} The value stored under the specific key
	 */
	get (key:string, alternative?:any):any;

}

export = ConfigInterface;