/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.ui.UiComponentInterface
 */
interface UiComponentInterface {

	/**
	 * Returns the channel name used by this component
	 *
	 * @method core.ui.UiComponentInterface#getChannelName
	 */
	getChannelName ():string;

	/**
	 * Returns the state of the component at all times. The method get's called whenever a new client connects to the
	 * channel and can/should be used to send data packets to the client.
	 *
	 * @returns {any}
	 */
	getState():any;

	/**
	 * The onConnection gets called as soon as someone connects to component channel
	 *
	 * todo ts-definition
	 *
	 * @method core.ui.UiComponentInterface#onConnection
	 *
	 * @param {net.Socket} spark
	 */
	onConnection (spark:any):void;

}

export = UiComponentInterface;