/// <reference path='../../../main.d.ts' />

import fs = require('fs');

import ClosableInterface = require('../../utils/interfaces/ClosableInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherInterface
 */
interface FolderWatcherInterface extends ClosableInterface {

	/**
	 * Adds the callback to the event emitter for the specified event name.
	 *
	 * Possible file events are:
	 *  - add
	 *  - change
	 *  - unlink
	 *
	 * @method core.fs.FolderWatcherInterface#on
	 *
	 * @param {string} eventName
	 * @param {Function} callback
	 */
	on (eventName:string, callback:(filePath?:string, stats?:fs.Stats) => any):void;

	/**
	 * Removes the callback from the event emitter for the specified event Name
	 *
	 * @method core.fs.FolderWatcherInterface#off
	 *
	 * @param {string} eventName
	 * @param {Function} callback
	 */
	off (eventName:string, callback:(filePath?:string, stats?:fs.Stats) => any):void;

}

export = FolderWatcherInterface;