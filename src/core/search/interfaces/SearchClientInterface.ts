/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * The
 * @interface
 * @class core.search.SearchClientInterface
 */
interface SearchClientInterface extends ClosableAsyncInterface {

	/**
	 *
	 * @param {Object} objectToIndex
	 * @param {Function} callback
	 */
	addItem (objectToIndex:Object, callback?:(err:Error) => any):void;

	/**
	 * @param type
	 * @param mapping
	 * @param callback
	 */
	addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void;

	/**
	 *
	 * @param {string} type
	 * @param {Function} callback
	 */
	typeExists (type:string, callback:(exists:boolean) => any):void

	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void;
	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;
}

export = SearchClientInterface;