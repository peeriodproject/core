/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * The IndexManagerInterface acts as controller between the FolderWatcherManager and the SearchManager.
 * It validates paths from the FolderWatcherManager before passing them to the SearchManager.
 *
 * @interface
 * @class core.search.IndexManagerInterface
 */
interface IndexManagerInterface extends ClosableAsyncInterface {

	addToIndex(pathToAdd:string, stats:fs.Stats, callback?:(err:Error) => any):void;

	/**
	 * Forces the indexManager to index all pending objects.
	 *
	 * @param callback
	 */
	forceIndex (callback?:(err:Error) => any):void;

	isPaused (callback:(isPaused:boolean) => any):void;

	/**
	 * Pauses the indexing process
	 *
	 * @param callback
	 */
	pause (callback?:(err:Error) => any):void;

	/**
	 * Resumes the indexing process
	 *
	 * @param callback
	 */
	resume (callback?:(err:Error) => any):void;

	//removeFromIndex(pathToAdd:string):void;

}

export = IndexManagerInterface;