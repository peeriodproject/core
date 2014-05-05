/**
 * @interface
 * @class core.utils.ClosableInterface
 */
interface ClosableInterface {

	/**
	 * Closes the Object and prevent any further updates.
	 * This method stores the object state and could be used on app shutdown.
	 *
	 * todo: add throw exeption
	 *
	 * @method core.utils.ClosableInterface#close
	 */
	close ():void;

	/**
	 * Returns true if the object is open and therefore writeable.
	 *
	 * @method core.utils.ClosableInterface#isOpen
	 */
	isOpen ():boolean;

	/**
	 * (Re)-opens a closed Object and restores the previous state.
	 *
	 * todo: add throw exeption
	 *
	 * @method core.utils.ClosableInterface#open
	 */
	open ():void;

}

export = ClosableInterface;