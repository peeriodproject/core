import ObjectConfig = require('./ObjectConfig');
import ConfigKeyListInterface = require('./interfaces/ConfigKeyListInterface');

// require declaration json loading
declare var require;

/**
 * The class `JSONConfig` loads a JSON-file and converts it into a dot-notated key-value store.
 *
 * @see {@link core.config.ObjectConfig} for an example how to limit the store to specified namespaces.
 *
 * @class core.config.JSONConfig
 * @extends core.config.ObjectConfig
 *
 * @throws Throws a `file not found` error if no file could be found at the specified `configPath`.
 * @throws Throws a `syntax error` if the specified file contains invalid JSON.
 *
 * @param {string} configPath The path to the JSON file
 * @param {core.config.ConfigKeyListInterface} configKeys An array of namespace keys to limit the store
 */
class JSONConfig extends ObjectConfig {

	constructor (configPath:string, configKeys:ConfigKeyListInterface = []) {
		var fileData:Object = {};

		try {
			if (configPath.indexOf('.json') === -1) {
				fileData = require(configPath + '.json');
			}
			else {
				fileData = require(configPath);
			}
		}
		catch (err) {
			if (err.code === 'MODULE_NOT_FOUND') {
				throw new Error('JSONConfig.constructor: Cannot find config file: "' + configPath + '"');
			}
			else if (err.constructor.call().toString() === 'SyntaxError') {
				throw new Error('JSONConfig.constructor: The file "' + configPath + '" is not a valid JSON-File.');
			}
			else {
				throw err;
			}
		}

		super(fileData, configKeys);
	}

}

export = JSONConfig;