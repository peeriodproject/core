import ObjectConfig = require('./ObjectConfig');
import ConfigKeyListInterface = require('./interfaces/ConfigKeyListInterface');

// require declaration json loading
declare var require;

/**
 * The class `JSONConfig` loads a JSON-file and converts it into a dot.notated key-value store.
 *
 * @class core.config.JSONConfig
 * @extends core.config.ObjectConfig
 *
 * todo add throw comment
 * todo implement json loading without require
 *
 *
 * @param {string} configPath
 * @param {core.config.ConfigKeyListInterface} keys
 */
class JSONConfig extends ObjectConfig {

	constructor (configPath:string, keys:ConfigKeyListInterface = []) {
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

		super(fileData, keys);
	}

}

export = JSONConfig;