/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FolderWatcherManagerInterface = require('../fs/interfaces/FolderWatcherManagerInterface');
import IndexManagerInterface = require('./interfaces/IndexManagerInterface');
import PathValidatorInterface = require('../fs/interfaces/PathValidatorInterface');
import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

/**
 * @class core.search.IndexManager
 * @implements core.search.IndexManagerInterface
 */
class IndexManager implements IndexManagerInterface {

	private _config:ConfigInterface = null;

	private _folderWatcherManager:FolderWatcherManagerInterface = null;

	private _isOpen:boolean = false;

	private _isIndexing:boolean = false;
	private _indexRunnerDelayInMilliSeconds:number = 10000;
	private _indexRunnerTimeout:number = -1;
	private _indexRunnersInParallelAmount:number = 3;
	private _indexRunnersInParallelRunning:number = 0;

	private _pathValidator:PathValidatorInterface = null;
	private _pendingPathsToIndex = {};
	private _currentPendingPathsToIndex = {};

	private _searchManager:SearchManagerInterface = null;

	constructor (config:ConfigInterface, folderWatcherManager:FolderWatcherManagerInterface, pathValidator:PathValidatorInterface, searchManager:SearchManagerInterface) {
		// todo add defaults

		this._config = config;
		this._folderWatcherManager = folderWatcherManager;
		this._pathValidator = pathValidator;
		this._searchManager = searchManager;

		this._indexRunnerDelayInMilliSeconds = this._config.get('search.indexManager.indexRunnerDelayInMilliSeconds');
		this._indexRunnersInParallelAmount = this._config.get('search.indexManager.indexRunnersInParallel');

		// todo add merged options

		this.open();
	}

	addToIndex (pathToAdd:string, stats:fs.Stats, callback?:(err:Error) => any):void {
		if (!this._pendingPathsToIndex[pathToAdd]) {
			this._pendingPathsToIndex[pathToAdd] = this._createPendingListObject(pathToAdd, stats, callback);
		}
	}

	close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (!this._isOpen) {
			this.pause();
			return process.nextTick(internalCallback.bind(null, null));
		}

		var returned:boolean = false;
		var folderWatcherManagerIsClosed:boolean = false;
		var searchManagerIsClosed:boolean = false;
		var testClose = (err:Error) => {
			if (err) {
				internalCallback(err);
				returned = true;
			}
			else if (!returned && folderWatcherManagerIsClosed && searchManagerIsClosed) {
				this.pause();
				this._isOpen = false;
				internalCallback(null);
			}
		};

		this._stopIndexRunner();

		// close folderWatcherManager
		this._folderWatcherManager.close(function (err:Error) {
			folderWatcherManagerIsClosed = true;

			testClose(err);
		});

		// close searchManager
		this._searchManager.close(function (err:Error) {
			searchManagerIsClosed = true;

			testClose(err);
		});

	}

	forceIndex (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._processPendingPathsToIndex();
	}

	isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	isPaused (callback:(isPaused:boolean) => any):void {
		return process.nextTick(callback.bind(null, !this._isIndexing));
	}

	open (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (this._isOpen) {
			this.resume();
			return process.nextTick(internalCallback.bind(null, null));
		}

		var returned:boolean = false;
		var folderWatcherManagerIsOpen:boolean = false;
		var searchManagerIsOpen:boolean = false;
		var testOpen:Function = (err:Error) => {
			if (err) {
				internalCallback(err);
				returned = true;
			}
			else if (!returned && folderWatcherManagerIsOpen && searchManagerIsOpen) {
				this._isOpen = true;
				this.resume();

				internalCallback(null);
			}
		};

		this._folderWatcherManager.open(function (err:Error) {
			folderWatcherManagerIsOpen = true;

			testOpen(err);
		});

		this._bindToFolderWatcherManagerEvents();

		this._searchManager.open(function (err:Error) {
			searchManagerIsOpen = true;

			testOpen(err);
		});
	}

	pause (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (this._isIndexing) {
			//console.log('stopping the index runner');
			this._stopIndexRunner();
			this._isIndexing = false;
		}

		return process.nextTick(internalCallback.bind(null, null));
	}

	resume (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (!this._isIndexing) {
			//console.log('starting the index runner');
			this._isIndexing = true;
			this._startIndexRunner();
		}

		return process.nextTick(internalCallback.bind(null, null));
	}

	private _bindToFolderWatcherManagerEvents ():void {
		this._folderWatcherManager.on('add', (changedPath:string, stats:fs.Stats) => {
			//this._triggerEvent('add', changedPath, stats);
		});
		this._folderWatcherManager.on('change', (changedPath:string, stats:fs.Stats) => {
			//this._triggerEvent('change', changedPath, stats);
		});
		this._folderWatcherManager.on('unlink', (changedPath:string, stats:fs.Stats) => {
			//this._triggerEvent('unlink', changedPath, stats);
		});
	}

	private _indexRunner ():void {
		////console.log('pending');
		////console.log(this._pendingPathsToIndex);
		// copy items from the pending paths list into the current batch
		if (Object.keys(this._pendingPathsToIndex).length) {
			for (var pathToIndex in this._pendingPathsToIndex) {
				this._currentPendingPathsToIndex[pathToIndex] = this._pendingPathsToIndex[pathToIndex];

				delete this._pendingPathsToIndex[pathToIndex];

				//console.log(this._currentPendingPathsToIndex[pathToIndex]);
			}

			this._processPendingPathsToIndex();
		}

		////console.log('current');
		////console.log(this._currentPendingPathsToIndex);

		this._startIndexRunner();
	}

	private _processPendingPathsToIndex ():void {
		//console.log('process pending path to index');
		// run x index processes in parallel
		var processesStarted:number = 0;
		var created:boolean = true;

		while (created && processesStarted < this._indexRunnersInParallelAmount) {
			created = this._createPendingPathProcessor();
		}
	}

	// todo add return type
	private _createPendingListObject (pathToIndex:string, stats:fs.Stats, callback?:Function):any {
		return {
			isIndexing: false,
			stats:stats,
			callback: callback || function () {}
		};
	}

	/**
	 * @returns {boolean} processor created
	 */
	private _createPendingPathProcessor ():boolean {
		var pathToIndex:string = null;
		var pathData = null;
		var created:boolean = false;

		if (Object.keys(this._currentPendingPathsToIndex).length && this._isIndexing) {
			//console.log('going to create a pending path processor');
			// look for path that aren't processed at the moment
			for (var pendingPath in this._currentPendingPathsToIndex) {
				if (!this._currentPendingPathsToIndex[pendingPath].isIndexing) {
					pathToIndex = pendingPath;
					pathData = this._currentPendingPathsToIndex[pendingPath];

					break;
				}
			}

			if (pathToIndex && pathData) {
				//console.log('created parallel index runner for', pathToIndex);
				this._processPendingPathToIndex(pathToIndex, pathData.stats, (err:Error) => {
					this._indexRunnersInParallelRunning--;

					// call callback and clean up current list
					this._removeCurrentPendingPathToIndex(pathToIndex, err);

					if (this._indexRunnersInParallelRunning < this._indexRunnersInParallelAmount) {
						// create a new processor
						this._createPendingPathProcessor();
					}
				});

				this._indexRunnersInParallelRunning++;
				created = true;
			}
		}

		return created;
	}

	/**
	 * Processes an item from teh {@link core.search.IndexManager~_currentPendingPathToIndex} list.
	 * It checkes weather the item exists in the searchManager by using {@link core.search.IndexManager~_getItemFromSearchManager}
	 * and validates the returned state via {@link core.search.IndexManager~_validateItem}. If the item does not exists yet
	 * or needs reindexing it is passed to the {@link core.search.IndexManager~_addItem} method.
	 *
	 * @method core.search.IndexManager~_processPendingPathToIndex
	 *
	 * @param {string} pathToIndex
	 * @param {fs.Stats} stats
	 * @param {Function} callback
	 */
	private _processPendingPathToIndex (pathToIndex:string, stats:fs.Stats, callback:(err:Error) => void):void {
		this._currentPendingPathsToIndex[pathToIndex].isIndexing = true;

		this._getItemStatsFromSearchManager(pathToIndex, (searchManagerHash:string, searchManagerStats:fs.Stats) => {
			// item exists
			if (searchManagerStats) {
				////console.log('validating item');
				this._validateItem(pathToIndex, searchManagerHash, searchManagerStats, (err:Error, isValid:boolean, fileHash:string, fileStats:fs.Stats) => {
					//console.log('item is valid:', isValid);
					if (isValid) {
						//console.log('item is already fully indexed');
						// todo check against the amount of plugins which indexed this file. Maybe some plugins are new
						callback(new Error('IndexManager~_processPendingPathToIndex: The item at path "' + pathToIndex + '" is already indexed.'));
					}
					else {
						this._addItem(pathToIndex, stats, callback);
					}
				});
				/**/
			}
			else {
				// adding new item
				this._addItem(pathToIndex, stats, callback);
			}
		});
	}

	/**
	 * Adds an path to the Database by passing it to the {@link core.search.SearchManagerInterface#addItem} method
	 *
	 * @method core.search.IndexManager~_addItem
	 *
	 * @param {string} pathToAdd
	 * @param {fs.Stats} stats
	 * @param {Function} callback
	 */
	private _addItem(pathToAdd:string, stats:fs.Stats, callback:(err:Error) => any):void {
		this._searchManager.addItem(pathToAdd, stats, (err:Error) => {
			if (err) {
				// todo reset isIndexing flag
				return callback(err);
			}

			return callback(null);
		});
	}

	/**
	 * Returns the stats and the file hash returned from the {@link core.search.IndexManagerInteface#getItem} for the given path
	 *
	 * @method core.search.IndexManager~_getItemStatsFromSearchManager
	 *
	 * @param {string} pathToIndex
	 * @param {Function} callback
	 */
	private _getItemStatsFromSearchManager (pathToIndex:string, callback:(searchManagerHash:string, stats:fs.Stats) => any):void {
		this._searchManager.getItem(pathToIndex, function (hash:string, stats:fs.Stats) {
			callback(hash, stats);
		});
	}

	/**
	 * Two step validation against the model in the database.
	 * The first step is a fs.Stats validation using the {@link core.fs.PathValidator#validateStats}
	 * If the first step fails a second check using {@link core.fs.PathValidator#validateHash} will be performed.
	 *
	 * @param {string} itemPath
	 * @param {string} searchManagerItemHash
	 * @param {fs.Stats} searchManagerItemStats
	 * @param {Function} callback
	 */
	private _validateItem (itemPath:string, searchManagerItemHash:string, searchManagerItemStats:fs.Stats, callback:(err:Error, isValid:boolean, fileHash:string, fileStats:fs.Stats) => any):void {
		// 1. step: validating stats
		this._pathValidator.validateStats(itemPath, searchManagerItemStats, (err:Error, statsAreValid:boolean, fileStats:fs.Stats) => {
			if (err) {
				return callback(err, false, null, null);
			}
			else if (statsAreValid) {
				return callback(null, statsAreValid, null, null);
			}
			else {
				// 2. step: validating file hash
				this._pathValidator.validateHash(itemPath, searchManagerItemHash, function (err:Error, hashIsValid:boolean, fileHash:string) {
					if (err) {
						return callback(err, false, null, null);
					}
					if (hashIsValid) {
						return callback(null, hashIsValid, null, null);
					}
					else {
						return callback(null, false, fileHash, fileStats);
					}
				});
			}
		});
	}

	/**
	 * Calls the callback method stored for the path and removes it from the processing list.
	 *
	 * @param {string} pathToIndex
	 * @param {Error} err
	 */
	private _removeCurrentPendingPathToIndex (pathToIndex:string, err:Error):void {
		//console.log('removing from current list and calling callback for', pathToIndex);
		this._currentPendingPathsToIndex[pathToIndex].callback(err);

		delete this._currentPendingPathsToIndex[pathToIndex];
	}

	/**
	 * Starts the index runner which starts the index process after the specified
	 * {@link core.search.IndexManager~__indexRunnerDelayInMilliSeconds} delay.
	 *
	 * @method core.search.IndexManager~_startIndexRunner
	 */
	private _startIndexRunner ():void {
		if (this._isIndexing) {
			this._indexRunnerTimeout = setTimeout(() => {
				////console.log('index runner interval');
				////console.log(this._pendingPathsToIndex);
				this._indexRunner();
			}, this._indexRunnerDelayInMilliSeconds);
		}
	}

	/**
	 * Stops the previous started index runner.
	 *
	 * @method core.search.IndexManager~_stopIndexRunner
	 */
	private _stopIndexRunner ():void {
		if (this._indexRunnerTimeout) {
			clearTimeout(this._indexRunnerTimeout);
		}
	}
}

export = IndexManager;