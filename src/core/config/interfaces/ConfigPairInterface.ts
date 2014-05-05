/**
 * A `ConfigPairInterface` represents a single key-value combination.
 *
 * @example
 *   var configPair:ConfigPairInterface = {
 *     'key': Primitive
 *   };
 *
 * @interface
 * @class core.config.ConfigPairInterface
 */
interface ConfigPairInterface {
	[key:string]:Object;
}

export = ConfigPairInterface;