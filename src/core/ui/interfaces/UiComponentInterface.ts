/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

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
	 * The onConnection gets called as soon as someone connects to component channel
	 *
	 * @method core.ui.UiComponentInterface#onConnection
	 *
	 * @param {net.Socket} spark
	 */
	onConnection (spark:any):void;

}

export = UiComponentInterface;