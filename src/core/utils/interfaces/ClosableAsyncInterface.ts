/**
 * @interface
 * @class core.utils.ClosableAsyncInterface
 */
interface ClosableAsyncInterface {

	/**
	 * Closes the Object and prevent any further updates.
	 * This method stores the object state and could be used on app shutdown.
	 *
	 * todo: add throw exeption
	 *
	 * @method core.utils.ClosableInterface#close
	 *
	 * @param {Function} callback
	 */
	close (callback?:(err:Error) => any):void;

	/**
	 * Returns true if the object is open and therefore writeable.
	 *
	 * todo: Wir sollten über den Callback-Style nachdenken und evtl. Callbacks/Deferreds verwenden.
	 *
	 * @method core.utils.ClosableInterface#isOpen
	 *
	 * @param {Function} callback
	 */
	isOpen (callback:(err:Error, isOpen:boolean) => any):void;

	/**
	 * (Re)-opens a closed Object and restores the previous state.
	 *
	 * todo: add throw exeption
	 *
	 * @method core.utils.ClosableInterface#open
	 *
	 * @param {Function} callback
	 */
	open (callback?:(err:Error) => any):void;

}

export = ClosableAsyncInterface;