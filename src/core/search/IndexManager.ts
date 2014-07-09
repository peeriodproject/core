/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FolderWatcherManagerInterface = require('../fs/interfaces/FolderWatcherManagerInterface');
import IndexManagerInterface = require('./interfaces/IndexManagerInterface');
import IndexManagerPendingListObjectInterface = require('./interfaces/IndexManagerPendingListObjectInterface');
import IndexManagerPendingListObjectMapInterface = require('./interfaces/IndexManagerPendingListObjectMapInterface');
import PathValidatorInterface = require('../fs/interfaces/PathValidatorInterface');
import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

var logger = require('../utils/logger/LoggerFactory').create();

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.search.IndexManager
 * @implements core.search.IndexManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {core.fs.FolderWatcherManagerInterface} folerWatcherManager
 * @param {core.fs.PathValidatorInterface} pathValidator
 * @param {core.search.SearchManagerInterface} searchManager
 */
class IndexManager implements IndexManagerInterface {

	/**
	 * The inernally used config instance
	 *
	 * @member {core.config.ConfigInterface} core.search.IndexManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The map of paths that are currently processed
	 *
	 * @member {core.search.IndexManagerPendingListObjectMapInterface} core.search.IndexManager~_currentPendingPathsToIndex
	 */
	private _currentPendingPathsToIndex:IndexManagerPendingListObjectMapInterface = {};

	/**
	 * The internally used FolderWatcherManager instance
	 *
	 * @member {core.fs.FolderWatcherManagerInterface} core.search.IndexManager~_folderWatcherManager
	 */
	private _folderWatcherManager:FolderWatcherManagerInterface = null;

	/**
	 * A flag indicates weather the IndexManager is currently indexing or paused
	 *
	 * @member {boolean} core.search.IndexManager~_isIndexing
	 */
	private _isIndexing:boolean = false;

	/**
	 * The idle time between index runs in milliseconds
	 *
	 * @member {number} core.search.IndexManager~_indexRunnerDelayInMilliSeconds
	 */
	private _indexRunnerDelayInMilliSeconds:number = 10000;

	/**
	 * Stores the index runner timeout function
	 *
	 * @member {number} core.search.IndexManager~_indexRunnerTimeout
	 */
	private _indexRunnerTimeout:number = null;

	/**
	 * The amount of index runners running in parallel
	 *
	 * @member {number} core.search.IndexManager~_indexRunnersInParallelAmount
	 */
	private _indexRunnersInParallelAmount:number = 3;

	/**
	 * The amount of index runners that are currently running
	 *
	 * @member {number} core.search.IndexManager~_indexRunnersInParallelRunning
	 */
	private _indexRunnersInParallelRunning:number = 0;

	/**
	 * A flag indicates weather the IndexManager is open or closed
	 *
	 * @member {boolean} core.search.IndexManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The merged options object
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.search.IndexManager~_options
	 */
	private _options:ClosableAsyncOptions = {};

	/**
	 * The internally used PathValidatorInterface instance
	 *
	 * @member {core.fs.PathValidatorInterface} core.search.IndexManager~_pathValidator
	 */
	private _pathValidator:PathValidatorInterface = null;

	/**
	 * The map of pending paths to index
	 *
	 * @member {core.search.IndexManagerPendingListObjectMapInterface} core.search.IndexManager~_pendingPathsToIndex
	 */
	private _pendingPathsToIndex:IndexManagerPendingListObjectMapInterface = {};

	/**
	 * The internally used SearchManagerInterface instance
	 *
	 * @member {core.search.SearchManagerInterface} core.search.IndexManager~_searchManager
	 */
	private _searchManager:SearchManagerInterface = null;

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, folderWatcherManager:FolderWatcherManagerInterface, pathValidator:PathValidatorInterface, searchManager:SearchManagerInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onOpenCallback: function () {},
			onCloseCallback: function () {},
			closeOnProcessExit: true
		};

		this._config = config;
		this._folderWatcherManager = folderWatcherManager;
		this._pathValidator = pathValidator;
		this._searchManager = searchManager;

		this._options = ObjectUtils.extend(defaults, options);

		this._indexRunnerDelayInMilliSeconds = this._config.get('search.indexManager.indexRunnerDelayInMilliSeconds');
		this._indexRunnersInParallelAmount = this._config.get('search.indexManager.indexRunnersInParallel');

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public addToIndex (pathToAdd:string, stats:fs.Stats, callback?:(err:Error) => any):void {
		if (!this._pendingPathsToIndex[pathToAdd]) {
			this._pendingPathsToIndex[pathToAdd] = this._createPendingListObject(pathToAdd, stats, callback);
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

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

	public forceIndex (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._processPendingPathsToIndex();
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public isPaused (callback:(isPaused:boolean) => any):void {
		return process.nextTick(callback.bind(null, !this._isIndexing));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

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

	public pause (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (this._isIndexing) {
			this._stopIndexRunner();
			this._isIndexing = false;
		}

		return process.nextTick(internalCallback.bind(null, null));
	}

	public resume (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (!this._isIndexing) {
			this._isIndexing = true;
			this._startIndexRunner();
		}

		return process.nextTick(internalCallback.bind(null, null));
	}

	private _bindToFolderWatcherManagerEvents ():void {
		this._folderWatcherManager.on('add', (changedPath:string, stats:fs.Stats) => {
			this.addToIndex(changedPath, stats);
			//this._triggerEvent('add', changedPath, stats);
		});
		this._folderWatcherManager.on('change', (changedPath:string, stats:fs.Stats) => {
			//this._triggerEvent('change', changedPath, stats);
		});
		this._folderWatcherManager.on('unlink', (changedPath:string, stats:fs.Stats) => {
			//this._triggerEvent('unlink', changedPath, stats);
		});
	}

	/**
	 *
	 * @private
	 */
	private _indexRunner ():void {
		var keys:Array<string> = Object.keys(this._pendingPathsToIndex);

		if (keys.length) {
			for (var pathToIndex in this._pendingPathsToIndex) {
				this._currentPendingPathsToIndex[pathToIndex] = this._pendingPathsToIndex[pathToIndex];

				delete this._pendingPathsToIndex[pathToIndex];
			}

			this._processPendingPathsToIndex();
		}

		this._startIndexRunner();
	}

	/**
	 * Creates {@link core.search.IndexManager~_indexInrrersInParallelAmount} new
	 * [PendingPathProcessors]{@link @method core.search.IndexManager~_createPendingPathProcessor}
	 *
	 * @method core.search.IndexManager~_processPendingPathToIndex
	 */
	private _processPendingPathsToIndex ():void {
		var processesStarted:number = 0;
		var created:boolean = true;

		while (created && processesStarted < this._indexRunnersInParallelAmount) {
			created = this._createPendingPathProcessor();

			if (created) {
				processesStarted++;
			}
		}
	}

	/**
	 * Creates a {@link core.search.IndexManagerPendingListObjectInterface} of the given arguments
	 *
	 * @method core.search.IndexManager~_createPendingListObject
	 *
	 * @param {string} pathToIndex
	 * @param {fs.Stats} stats
	 * @param {Function} callback
	 * @returns {core.search.IndexManagerPendingListObjectInterface}
	 */
	private _createPendingListObject (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):IndexManagerPendingListObjectInterface {
		return {
			isIndexing: false,
			stats     : stats,
			callback  : callback || function () {
			}
		};
	}

	/**
	 * Creates a path processor for all pending paths in the {@link core.search.IndexManager~_currentPendingPathsToIndex} List
	 *
	 * @method core.search.IndexManager~_createPendingPathProcessor
	 *
	 * @returns {boolean} processor successfully created
	 */
	private _createPendingPathProcessor ():boolean {
		var pathToIndex:string = null;
		var pathData = null;
		var created:boolean = false;

		if (Object.keys(this._currentPendingPathsToIndex).length && this._isIndexing) {

			for (var pendingPath in this._currentPendingPathsToIndex) {
				if (!this._currentPendingPathsToIndex[pendingPath].isIndexing) {
					pathToIndex = pendingPath;
					pathData = this._currentPendingPathsToIndex[pendingPath];

					break;
				}
			}

			if (pathToIndex && pathData) {
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
	 * Processes an item from the {@link core.search.IndexManager~_currentPendingPathToIndex} list.
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
			if (searchManagerHash && searchManagerStats) {
				////console.log('validating item');
				this._validateItem(pathToIndex, searchManagerHash, searchManagerStats, (err:Error, isValid:boolean, fileHash:string, fileStats:fs.Stats) => {
					if (isValid) {
						// todo check against the amount of plugins which indexed this file. Maybe some plugins are new
						callback(new Error('IndexManager~_processPendingPathToIndex: The item at path "' + pathToIndex + '" is already indexed.'));
					}
					else {
						this._addItem(pathToIndex, stats, fileHash, callback);
					}
				});
			}
			else {
				// adding new item
				this._pathValidator.getHash(pathToIndex, (err:Error, fileHash:string) => {
					this._addItem(pathToIndex, stats, fileHash, callback);
				});
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
	private _addItem (pathToAdd:string, stats:fs.Stats, fileHash:string, callback:(err:Error) => any):void {
		logger.debug('indexing item', { path: pathToAdd });

		this._searchManager.addItem(pathToAdd, stats, fileHash, (err:Error) => {
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
	 * @method core.search.IndexManager~_validateItem
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
	 * @method core.search.IndexManager~_removeCurrentPendingPathToIndex
	 *
	 * @param {string} pathToIndex
	 * @param {Error} err
	 */
	private _removeCurrentPendingPathToIndex (pathToIndex:string, err:Error):void {
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