/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * The IndexManagerInterface acts as controller between the FolderWatcherManager and the SearchManager.
 * It validates paths from the FolderWatcherManager, before passing them in batches to the SearchManager for further processing.
 *
 * @interface
 * @class core.search.IndexManagerInterface
 */
interface IndexManagerInterface extends ClosableAsyncInterface {

	/**
	 * Adds the given path and stats to the pending index list.
	 *
	 * @method core.search.IndexManagerInterface#addToIndex
	 *
	 * @param {string} pathToAdd
	 * @param {fs.Stats} stats
	 * @param {Function} callback
	 */
	addToIndex(pathToAdd:string, stats:fs.Stats, callback?:(err:Error) => any):void;

	/**
	 * Forces the indexManager to index all pending objects.
	 *
	 * @method core.search.IndexManagerInterface#forceIndex
	 *
	 * @param callback
	 */
	forceIndex (callback?:(err:Error) => any):void;

	/**
	 * Returnes whether the indexing process is paused or active.
	 *
	 * @method core.search.IndexManagerInterface#isPaused
	 *
	 * @param callback
	 */
	isPaused (callback:(isPaused:boolean) => any):void;

	/**
	 * Pauses the indexing process
	 *
	 * @method core.search.IndexManagerInterface#pause
	 *
	 * @param callback
	 */
	pause (callback?:(err:Error) => any):void;

	/**
	 * Resumes the indexing process
	 *
	 * @method core.search.IndexManagerInterface#resume
	 *
	 * @param callback
	 */
	resume (callback?:(err:Error) => any):void;

	//removeFromIndex(pathToAdd:string):void;

}

export = IndexManagerInterface;