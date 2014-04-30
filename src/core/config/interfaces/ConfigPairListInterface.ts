import ConfigPairInterface = require('./ConfigPairInterface');

/**
 * A `ConfigPairListInterface` represents an array of @{link config.ConfigPair}.
 *
 * @interface
 * @class core.config.ConfigPairListInterface
 */
interface ConfigPairListInterface extends Array<ConfigPairInterface> {
}

export = ConfigPairListInterface;