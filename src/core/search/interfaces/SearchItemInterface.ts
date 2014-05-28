/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginNameListInterface = require('../../plugin/interfaces/PluginNameListInterface');

/**
 * @interface
 * @class core.search.SearchItemInterface
 */
interface SearchItemInterface {
	/**
	 * Returns the hash of the item
	 *
	 * @method core.search.SearchItemInterface#getHash
	 *
	 * @returns {string}
	 */
	getHash():string;

	/**
	 * Returns the path of the item
	 *
	 * @method core.search.SearchItemInterface#getPath
	 *
	 * @returns {string}
	 */
	getPath():string;

	/**
	 * Returns an array of plugin identifiers
	 *
	 * @method core.search.SearchItemInterface#getPluginIdentifiers
	 *
	 * @param {core.plugin.PluginNameListInterface}
	 */
	getPluginIdentifiers ():PluginNameListInterface;

	/**
	 * Returns the plugin data for the specified identifier or null
	 *
	 * @method core.search.SearchItemInterface#getPluginData
	 *
	 * @param {string} identifier
	 * @returns {Object}
	 */
	getPluginData (identifier:string):Object;

	/**
	 * Returns the `fs.Stats` object of the item
	 */
	getStats():fs.Stats;

	/**
	 * Returns the average score of all plugin data.
	 *
	 * @method core.search.SearchItemInterface#getScore
	 *
	 * @returns {number}
	 */
	getScore ():number;

}

export = SearchItemInterface;