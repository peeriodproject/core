/**
 * A simple state loader interface.
 *
 * @interface
 * @class core.utils.StateHandlerInterface
 */
interface StateHandlerInterface {

	/**
	 * Loads the state form a previous specified location and passes it to the callback
	 *
	 * @method core.utils.StateManagerInterface#load
	 *
	 * @param {Function} callback
	 */
	load (callback:(err:Error, state:Object) => void):void;

	/**
	 * Saves the specified state to a previous specified loaction
	 *
	 * @method core.utils.StateManagerInterface#load
	 *
	 * @param {Function} callback
	 */
	save (state:Object, callback:(err:Error) => void):void;

}

export = StateHandlerInterface;