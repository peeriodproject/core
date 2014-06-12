/**
 * The `AppQuitHandlerInterface` provides the ability to run asyncronous code before the app will finally close.
 *
 * @interface
 * @class core.utils.AppQuitHandlerInterface
 */
interface AppQuitHandlerInterface {

	/**
	 * Adds a function that should be called before the app will close.
	 * The function __must__ call the `done` callback afterwards.
	 *
	 * @param {Function} callback
	 */
	add (callback:(done:Function) => any):void;

	/**
	 * Starts the quit procedure.
	 */
	quit ():void;

	/**
	 * Removes the specified function from the list.
	 *
	 * @param {Function} callback
	 */
	remove (callback:(done:Function) => any):void;

}

export = AppQuitHandlerInterface;