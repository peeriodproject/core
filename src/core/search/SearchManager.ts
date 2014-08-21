/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');
import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import PluginRunnerInterface = require('../plugin/interfaces/PluginRunnerInterface');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchItemInterface = require('../../../src/core/search/interfaces/SearchItemInterface');
import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

var logger = require('../utils/logger/LoggerFactory').create();

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.search.SearchManager
 * @implements core.search.SearchManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.plugin.PluginManagerInterface} pluginManager
 * @param {core.search.SearchClientInterface} searchClient
 */
class SearchManager implements SearchManagerInterface {

	private _config:ConfigInterface = null;

	private _isOpen:boolean = false;

	private _pluginManager:PluginManagerInterface = null;

	private _searchClient:SearchClientInterface = null;

	constructor (config:ConfigInterface, pluginManager:PluginManagerInterface, searchClient:SearchClientInterface) {
		this._config = config;
		this._pluginManager = pluginManager;
		this._searchClient = searchClient;

		this._registerPluginManagerEvents();
	}

	addItem (pathToIndex:string, stats:fs.Stats, fileHash:string, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		this._pluginManager.onBeforeItemAdd(pathToIndex, stats, fileHash, (pluginData:Object) => {

			pluginData = this._updatePluginData(pluginData, pathToIndex, stats, fileHash);
			//console.log(JSON.stringify(pluginData));
			// to the request to the database
			this._searchClient.addItem(pluginData, function (err) {
				logger.log('index', 'added item', { data: pluginData, path: pathToIndex });

				return internalCallback(err);
			});
		});
	}

	close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {
		};
		var closedPluginManager:boolean = false;
		var closedSearchClient:boolean = false;
		var checkAndClose = (err) => {
			if (closedPluginManager && closedSearchClient || err) {
				closedPluginManager = false;
				closedSearchClient = false;

				this._isOpen = false;

				return internalCallback(err);
			}
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._pluginManager.close(function (err) {
			closedPluginManager = true;

			return checkAndClose(err);
		});

		this._searchClient.close(function (err) {
			closedSearchClient = true;

			return checkAndClose(err);
		});
	}

	public getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void {
		this._searchClient.getItemByPath(pathToIndex, function (err:Error, item:SearchItemInterface) {
			if (item) {
				callback(item.getHash(), item.getStats());
			}
			else {
				callback(null, null);
			}
		});
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public itemExists (pathToIndex:string, callback:(exists:boolean) => void):void {
		console.log('todo SearchManager#itemExists');

		return process.nextTick(callback.bind(null, null, null));
	}

	open (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {
		};
		var openedPluginManager:boolean = false;
		var openedSearchClient:boolean = false;
		var checkAndClose = (err) => {
			if (openedPluginManager && openedSearchClient || err) {
				openedPluginManager = false;
				openedSearchClient = false;

				this._isOpen = true;

				return internalCallback(err);
			}
		};

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._pluginManager.open(function (err) {
			openedPluginManager = true;

			return checkAndClose(err);
		});

		this._searchClient.open((err) => {
			openedSearchClient = true;

			if (err) {
				return checkAndClose(err);
			}

			setImmediate(() => {
				this._updateAnalysis(function (err) {
					if (err) {
						console.log(err);
					}

					return checkAndClose(err);
				});
			});
		});
	}

	private _registerPluginManagerEvents ():void {
		// todo register on plugin delete handler and remove type from index
		this._pluginManager.addEventListener('pluginAdded', (pluginIdentifier) => {
			this._onPluginAddedListener(pluginIdentifier);
		});
	}

	private _onPluginAddedListener (pluginIdentifier:string):void {
		this._searchClient.typeExists(pluginIdentifier, (exists:boolean) => {
			if (exists) {
				return;
			}

			this._pluginManager.getActivePluginRunner(pluginIdentifier, (pluginRunner:PluginRunnerInterface) => {
				pluginRunner.getMapping((err:Error, mapping:Object) => {
					if (err) {
						console.error(err);
					}
					if (mapping) {
						mapping = this._updateMapping(mapping);

						this._searchClient.addMapping(pluginIdentifier, mapping, function (err) {
							if (err) {
								console.error(err);
							}
						});
					}
					else {
						// todo plugin uses elasticsearch auto mapping feature! Maybe it's better to throw an error here?
						console.log('todo: plugin uses elasticsearch auto mapping feature! Maybe it\'s better to throw an error here?');
					}
				});
			});
		});
	}

	private _updateAnalysis (callback:(err:Error) => any):void {
		var settings = {
			analysis: {
				analyzer : {
					filename_search: {
						tokenizer: "itemname",
						filter   : [
							"lowercase"
						]
					},
					filename_index : {
						tokenizer: "itemname",
						filter   : [
							"lowercase",
							"edge_ngram"
						]
					}
				},
				tokenizer: {
					itemname: {
						pattern: "[^\\p{L}\\d]+",
						type   : "pattern"
					}
				},
				filter   : {
					edge_ngram: {
						side    : "front",
						max_gram: 20,
						min_gram: 1,
						type    : "edgeNGram"
					}
				}
			}
		};

		this._searchClient.updateSettings(settings, callback);
	}

	/**
	 * Updates the given mapping by adding the item hash, item path and item stats.
	 *
	 * @method core.search.SearchManager~_updateMapping
	 *
	 * @param {Object} mapping
	 * @returns {Object} the restricted mapping
	 */
	private _updateMapping (mapping:Object):Object {
		var source:Object = mapping['_source'] || {};
		var properties:Object = mapping['properties'] || {};

		// remove file content from source
		// todo iterate over mapping and find attachment field by type
		if (properties && properties['file']) {
			mapping['_source'] = ObjectUtils.extend(source, {
				excludes: ['file']
			});
		}

		// todo check elasticsearch store:yes
		// update properties
		mapping['properties'] = ObjectUtils.extend(properties, {
			itemHash : {
				type : 'string',
				store: 'yes',
				index: 'not_analyzed'
			},
			itemPath : {
				type : 'string',
				store: 'yes',
				index: 'not_analyzed'
			},
			itemName : {
				type           : 'string',
				search_analyzer: "filename_search",
				index_analyzer : "filename_index"
				//store: 'yes'
			},
			itemStats: {
				type      : 'nested',
				properties: {
					atime  : {
						type  : 'date',
						format: 'dateOptionalTime',
						store : 'yes',
						index : 'not_analyzed'
					},
					blksize: {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					blocks : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					ctime  : {
						type  : 'date',
						format: 'dateOptionalTime',
						store : 'yes',
						index : 'not_analyzed'
					},
					dev    : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					gid    : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					ino    : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					mode   : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					mtime  : {
						type  : 'date',
						format: 'dateOptionalTime',
						store : 'yes',
						index : 'not_analyzed'
					},
					nlink  : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					rdev   : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					size   : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					},
					uid    : {
						type : 'long',
						store: 'yes',
						index: 'not_analyzed'
					}
				}
			}
		});

		return mapping;
	}

	/**
	 * Updates the given plugin data by adding the item path, stats and hash to each plugin identifier object
	 *
	 * @method core.search.SearchManager~_updatePluginData
	 *
	 * @param {Object} pluginData
	 * @param {string} itemPath
	 * @param {fs.Stats} stats
	 * @param {string} fileHash
	 * @returns {Object} the updated plugin data
	 */
	private _updatePluginData (pluginData:Object, itemPath:string, stats:fs.Stats, fileHash:string):Object {
		var identifiers:Array<string> = Object.keys(pluginData);

		if (identifiers.length) {
			for (var i = 0, l = identifiers.length; i < l; i++) {
				var identifier:string = identifiers[i];

				pluginData[identifier] = ObjectUtils.extend(pluginData[identifier], {
					itemHash : fileHash,
					itemPath : itemPath,
					itemName : path.basename(itemPath),
					itemStats: stats
				});
			}
		}
		return pluginData;
	}

}

export = SearchManager;