/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.ui.UiComponentInterface
 */
interface UiComponentInterface extends NodeJS.EventEmitter {

	/**
	 * Returns the channel name used by this component
	 *
	 * @method core.ui.UiComponentInterface#getChannelName
	 *
	 * @returns {Array}
	 */
	getChannelName ():string;

	/**
	 * Returns an array of event names the component ist listening to.
	 *
	 * @method core.ui.UiComponentInterface#getEventNames
	 *
	 * @returns {Array}
	 */
	getEventNames ():Array<string>;

	/**
	 * Returns the state of the component at all times. The method get's called whenever a new client connects to the
	 * channel and can/should be used to send data packets to the client.
	 *
	 * @returns {any}
	 */
	getState ():any;

	/**
	 * Calls the listener function whenever the state changed and the UI should update.
	 *
	 * @method core.ui.UiComponentInterface#onUiUpdate
	 *
	 * @param {Function} callback
	 */
	onUiUpdate (listener:() => any):void;

	/**
	 * Gets called after a UI was updated and got the latest state. This method can be used to cleanup the state.
	 *
	 * @method core.ui.UiComponentInterface#onAfterUiUpdate
	 */
	onAfterUiUpdate ():void;

	/**
	 * Calls the listener registered at {@link core.ui.UiComponentInterface.onUiUpdate} to send updates down the wire.
	 *
	 * @method core.ui.UiComponentInterface#UpdateUi
	 */
	updateUi ():void;

}

export = UiComponentInterface;