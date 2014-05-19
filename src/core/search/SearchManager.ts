/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

class SearchManager implements SearchManagerInterface {

	addItem (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):void {

	}

	close (callback?:(err:Error) => any):void {

	}

	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void {

	}

	isOpen (callback:(err:Error, isOpen:boolean) => any):void {

	}

	itemExists (callback:(exists:boolean) => void):void {

	}

	open (callback?:(err:Error) => any):void {

	}

}

export = SearchManager;