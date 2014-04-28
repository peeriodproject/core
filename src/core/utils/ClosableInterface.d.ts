/**
 * Created by joernroeder on 4/27/14.
 */

/**
 * @interface
 * @class utils.ClosableInterface
 */
interface ClosableInterface {
	/**
	 * Closes the Object and prevent any further updates.
	 * This method stores the object state and could be used on app shutdown.
	 *
	 * todo: add throw exeption
	 *
	 * @abstract
	 * @method utils.ClosableInterface#close
	 */
	close():void;

	/**
	 * Returns true if the object is open and therefore writeable.
	 *
	 * todo: Wir sollten über den Callback-Style nachdenken und evtl. Callbacks/Deferreds verwenden.
	 *
	 * @abstract
	 * @method utils.ClosableInterface#isOpen
	 */
	isOpen():boolean;

	/**
	 * (Re)-opens a closed Object and restores the previous state.
	 *
	 * todo: add throw exeption
	 *
	 * @abstract
	 * @method utils.ClosableInterface#open
	 */
	open():void;
}