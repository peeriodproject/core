import ConfigPairInterface = require('./ConfigPairInterface');

/**
 * A `ConfigPairListInterface` represents a list of {@link core.config.ConfigPairInterface}.
 *
 * @example
 *   var configPairList:ConfigPairListInterface = {
 *   	'key1.nested': value1,
 *   	'key2.nested': value2
 *   };
 *
 * @interface
 * @class core.config.ConfigPairListInterface
 */
interface ConfigPairListInterface extends Array<ConfigPairInterface> {
}

export = ConfigPairListInterface;