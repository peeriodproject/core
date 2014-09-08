import ClosableInterface = require('../../utils/interfaces/ClosableInterface');
import UiRoutineInterface = require('./UiRoutineInterface');
import UiRoutineListInterface = require('./UiRoutineListInterface');

/**
 * @interface
 * @class core.ui.UiRoutinesManagerInterface
 */
interface UiRoutinesManagerInterface extends ClosableInterface {

	/**
	 * Adds an instance of {@link core.ui.UiRoutineInterface} to the manager
	 *
	 * @method core.ui.UiRoutinesManager#addUiRoutine
	 *
	 * @param {@link core.ui.UiRoutineInterface} routine
	 */
	addUiRoutine (routine:UiRoutineInterface):void;

	/**
	 * Returns all installed ui routine ids
	 *
	 * @param callback
	 */
	getInstalledRoutineIds (callback:(err:Error, routinesIds:Array<string>) => any):void;

	/**
	 * Returns a list of all manages {@link core.ui.UiRoutineInterface} instances
	 *
	 * @method core.ui.UiRoutinesManager#getUiRoutines
	 *
	 * @returns core.ui.UiRoutineListInterface
	 */
	getUiRoutines ():UiRoutineListInterface;

	/**
	 * Returns a {@link core.ui.UiRoutineInterface} instance by id or null.
	 *
	 * @method core.ui.UiRoutinesManager#getUiRoutine
	 *
	 * @param {string} routineId
	 * @return core.ui.UiRoutineInterface
	 */
	getUiRoutine (routineId:string):UiRoutineInterface;

}

export = UiRoutinesManagerInterface;