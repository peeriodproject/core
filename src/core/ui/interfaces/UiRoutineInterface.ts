interface UiRoutineInterface {

	/**
	 * Returns a human readable description of the ui routine
	 *
	 * @method core.ui.UiRoutineInterface#getDescription
	 *
	 * @returns {string}
	 */
	getDescription ():string;

	/**
	 * Returns the unique id of the ui routine
	 *
	 * @method core.ui.UiRoutineInterface#getId
	 *
	 * @returns {string}
	 */
	getId ():string;

	/**
	 * Returns the svg icon of the ui routine encoded as base64 string __without__ the base64 svg header
	 *
	 * @method core.ui.UiRoutineInterface#getIconClassName
	 *
	 * @return {string}
	 */
	getIcon ():string;

	/**
	 * Returns the label that will be shown on the install button
	 * 
	 * @method core.ui.UiRoutineInterface
	 *
	 * @return {string}
	 */
	getInstallButtonLabel ():string;

	/**
	 * Returns a human readable name/title of the ui routine
	 *
	 * @method core.ui.UiRoutineInterface#getName
	 *
	 * @returns {string}
	 */
	getName ():string;

	/**
	 * Returns a aditional notice which will be shown below the description
	 *
	 * @method core.ui.UiRoutineInterface#getNotice
	 *
	 * @returns {string}
	 */
	getNotice ():string;

	/**
	 * Installs the ui routine and returns a possible error as the first argument in the callback
	 *
	 * @method core.ui.UiRoutineInterface#install
	 *
	 * @param callback
	 */
	install (callback?:(err:Error) => any):void;

	/**
	 * Returns whether the routine is installed or not.
	 *
	 * @method core.ui.UiRoutineInterface#isInstalled
	 *
	 * @param callback
	 */
	isInstalled (callback:(installed:boolean) => any):void;

	/**
	 * Starts the ui routine and returns a possible error as the first argument in the callback
	 *
	 * @method core.ui.UiRoutineInterface#start
	 *
	 * @param callback
	 */
	start (callback?:(err:Error) => any):void;

	/**
	 * Starts the ui routine and returns a possible error as the first argument in the callback
	 *
	 * @method core.ui.UiRoutineInterface#stop
	 *
	 * @param callback
	 */
	stop (callback?:(err:Error) => any):void;

	/**
	 * Uninstalls the ui routine and returns a possible error as the first argument in the callback
	 *
	 * @method core.ui.UiRoutineInterface#uninstall
	 *
	 * @param callback
	 */
	uninstall (callback?:(err:Error) => any):void;

}

export = UiRoutineInterface;