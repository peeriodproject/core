import StateHandlerInterface = require('./StateHandlerInterface');

/**
 * @interface
 * @class core.utils.StateHandlerFactoryInterface
 */
interface StateHandlerFactoryInterface {

	/**
	 * Creates a StateHandler instance
	 *
	 * @param {string} path The path of the file that the handler will use get and save the state
	 * @param {string} [fallbackPath] An optional fallback path where the handler will load it's initial state from.
	 */
	create(path:string, fallbackPath?:string):StateHandlerInterface;

}

export = StateHandlerFactoryInterface;