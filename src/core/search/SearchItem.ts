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

		var calcScoreAverage:boolean = false;

		for (var i in data) {
			var item = data[i];
			var source:Object = item['_source'];

			if (!source) {
				continue;
			}

			var identifier:string = item['_type'];

			// todo check identifier existence and throw error
			this._pluginIdentifiers.push(identifier);
			var score:number = item['_score'];

			// hits: calc average score
			if (!isNaN(score)) {
				calcScoreAverage = true;
				this._score += score;
			}
			// single response
			else {
				this._score = 1;
			}

			if (source) {
				this._processItemMember('Hash', source);
				this._processItemMember('Path', source);
				this._processItemMember('Stats', source);
			}

			// add plugin data
			if (Object.keys(source).length) {
				this._pluginData[identifier] = source;
			}
		}

		if (calcScoreAverage) {
			this._score = this._score / this._pluginIdentifiers.length;
		}
	}

	public getHash ():string {
		return this._hash;
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
				isValid = JSON.stringify(this[memberName]) === JSON.stringify(source['item' + name]);
			}

			if (!isValid) {
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