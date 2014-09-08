/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginNameListInterface = require('../plugin/interfaces/PluginNameListInterface');
import SearchItemInterface = require('./interfaces/SearchItemInterface');

/**
 * @class core.search.SearchItem
 * @implements core.search.SearchItemInterface
 */
class SearchItem implements SearchItemInterface {

	private _hash:string = null;
	private _name:string = null;
	private _path:string = null;
	private _pluginIdentifiers:PluginNameListInterface = [];
	private _pluginData:{ [identifier:string]:Object; } = {};
	private _score:number = 0;

	private _stats:fs.Stats = null;

	constructor(data:Array<Object>) {
		if (!data || !Array.isArray(data) || !data.length) {
			throw new Error('SearchItem.constructor: Invalid data: ' + JSON.stringify(data));
		}

		// quick array copy
		data = data.slice();

		var scoreDivider:number = 0;

		for (var i = 0, l = data.length; i < l; i++) {
			try {
				var addToScoreAverage:boolean = this._processItem(data[i]);

				if (addToScoreAverage) {
					scoreDivider++;
				}
			}
			catch (e) {
				//console.error(e);
			}
		}

		if (scoreDivider) {
			this._score = this._score / scoreDivider;
		}
		else {
			this._score = 1;
		}
	}

	public getHash ():string {
		return this._hash;
	}

	public getName ():string {
		return this._name;
	}

	public getPath ():string {
		return this._path;
	}

	public getPluginIdentifiers ():PluginNameListInterface {
		return this._pluginIdentifiers;
	}

	public getPluginData (identifier:string):Object {
		return this._pluginData[identifier] ? this._pluginData[identifier] : null;
	}

	public getScore ():number {
		return this._score;
	}

	public getStats ():fs.Stats {
		return this._stats;
	}

	/**
	 * Processes a single hit and check whether it can be added to the item or not.
	 * It pushes the identifier to the {@link core.search.SearchItem~_pluginIdentifiers} list and adds it's source to the
	 * {@link core.search.SearchItem~_pluginData} Map as well as updating the {@link core.search.SearchItem~_score} field
	 * and returning an indicator that the source update should be considered while calculating the average score.
	 *
	 * @method core.search.SearchItem~_processItem
	 *
	 * @param {Object} item The item that should be processed
	 * @returns {boolean} A flag indicates whether the item updated the score or not.
	 */
	private _processItem (item:Object):boolean {
		var source:Object = item['_source'];
		var addToScoreAverage:boolean = false;

		if (!source) {
			return addToScoreAverage;
		}

		this._processItemMember('Hash', source);
		this._processItemMember('Name', source);
		this._processItemMember('Path', source);
		this._processItemMember('Stats', source);

		var identifier:string = item['_type'];

		// todo check identifier existence and throw error
		this._pluginIdentifiers.push(identifier);
		var score:number = item['_score'];

		// hits: calc average score
		if (!isNaN(score)) {
			addToScoreAverage = true;
			this._score += score;
		}
		// single response
		else {
			this._score = 1;
		}

		// add plugin data
		this._pluginData[identifier] = Object.keys(source).length ? source : {};
		this._pluginData[identifier]['_id'] = item['_id'];

		return addToScoreAverage;
	}

	/**
	 * @method core.search.SearchItem~_processItemMember
	 *
	 * @param {string} name
	 * @param {Object} source
	 */
	private _processItemMember (name:string, source:Object):void {
		var lower:string = name.toLowerCase();
		var memberName:string  = '_' + lower;

		if (this[memberName] !== null) {
			var isValid:boolean = false;

			// strict equal for primitives
			if (typeof this[memberName] !== 'object') {
				isValid = this[memberName] === source['item' + name];
			}
			// JSON.stringify for objects
			else {
				// todo use correct stringify with sorted keys
				isValid = JSON.stringify(this[memberName]) === JSON.stringify(source['item' + name]);
			}

			if (!isValid) {
				//console.log(name, this[memberName], source);
				throw new Error('SearchItem~_processItemMember: "_source.item' + name + '" must be equal in all plugin data!');
			}
		}
		else if (this[memberName] === null) {
			this[memberName] = source['item' + name];
		}

		delete source['item' + name];
	}

}

export = SearchItem;