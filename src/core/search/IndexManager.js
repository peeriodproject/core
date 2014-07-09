/// <reference path='../../../ts-definitions/node/node.d.ts' />
var logger = require('../utils/logger/LoggerFactory').create();

var ObjectUtils = require('../utils/ObjectUtils');

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
var IndexManager = (function () {
    function IndexManager(config, appQuitHandler, folderWatcherManager, pathValidator, searchManager, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The inernally used config instance
        *
        * @member {core.config.ConfigInterface} core.search.IndexManager~_config
        */
        this._config = null;
        /**
        * The map of paths that are currently processed
        *
        * @member {core.search.IndexManagerPendingListObjectMapInterface} core.search.IndexManager~_currentPendingPathsToIndex
        */
        this._currentPendingPathsToIndex = {};
        /**
        * The internally used FolderWatcherManager instance
        *
        * @member {core.fs.FolderWatcherManagerInterface} core.search.IndexManager~_folderWatcherManager
        */
        this._folderWatcherManager = null;
        /**
        * A flag indicates weather the IndexManager is currently indexing or paused
        *
        * @member {boolean} core.search.IndexManager~_isIndexing
        */
        this._isIndexing = false;
        /**
        * The idle time between index runs in milliseconds
        *
        * @member {number} core.search.IndexManager~_indexRunnerDelayInMilliSeconds
        */
        this._indexRunnerDelayInMilliSeconds = 10000;
        /**
        * Stores the index runner timeout function
        *
        * @member {number} core.search.IndexManager~_indexRunnerTimeout
        */
        this._indexRunnerTimeout = null;
        /**
        * The amount of index runners running in parallel
        *
        * @member {number} core.search.IndexManager~_indexRunnersInParallelAmount
        */
        this._indexRunnersInParallelAmount = 3;
        /**
        * The amount of index runners that are currently running
        *
        * @member {number} core.search.IndexManager~_indexRunnersInParallelRunning
        */
        this._indexRunnersInParallelRunning = 0;
        /**
        * A flag indicates weather the IndexManager is open or closed
        *
        * @member {boolean} core.search.IndexManager~_isOpen
        */
        this._isOpen = false;
        /**
        * The merged options object
        *
        * @member {core.utils.ClosableAsyncOptions} core.search.IndexManager~_options
        */
        this._options = {};
        /**
        * The internally used PathValidatorInterface instance
        *
        * @member {core.fs.PathValidatorInterface} core.search.IndexManager~_pathValidator
        */
        this._pathValidator = null;
        /**
        * The map of pending paths to index
        *
        * @member {core.search.IndexManagerPendingListObjectMapInterface} core.search.IndexManager~_pendingPathsToIndex
        */
        this._pendingPathsToIndex = {};
        /**
        * The internally used SearchManagerInterface instance
        *
        * @member {core.search.SearchManagerInterface} core.search.IndexManager~_searchManager
        */
        this._searchManager = null;
        var defaults = {
            onOpenCallback: function () {
            },
            onCloseCallback: function () {
            },
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
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    IndexManager.prototype.addToIndex = function (pathToAdd, stats, callback) {
        if (!this._pendingPathsToIndex[pathToAdd]) {
            this._pendingPathsToIndex[pathToAdd] = this._createPendingListObject(pathToAdd, stats, callback);
        }
    };

    IndexManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            this.pause();
            return process.nextTick(internalCallback.bind(null, null));
        }

        var returned = false;
        var folderWatcherManagerIsClosed = false;
        var searchManagerIsClosed = false;
        var testClose = function (err) {
            if (err) {
                internalCallback(err);
                returned = true;
            } else if (!returned && folderWatcherManagerIsClosed && searchManagerIsClosed) {
                _this.pause();
                _this._isOpen = false;
                internalCallback(null);
            }
        };

        this._stopIndexRunner();

        // close folderWatcherManager
        this._folderWatcherManager.close(function (err) {
            folderWatcherManagerIsClosed = true;

            testClose(err);
        });

        // close searchManager
        this._searchManager.close(function (err) {
            searchManagerIsClosed = true;

            testClose(err);
        });
    };

    IndexManager.prototype.forceIndex = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._processPendingPathsToIndex();
    };

    IndexManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    IndexManager.prototype.isPaused = function (callback) {
        return process.nextTick(callback.bind(null, !this._isIndexing));
    };

    IndexManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            this.resume();
            return process.nextTick(internalCallback.bind(null, null));
        }

        var returned = false;
        var folderWatcherManagerIsOpen = false;
        var searchManagerIsOpen = false;
        var testOpen = function (err) {
            if (err) {
                internalCallback(err);
                returned = true;
            } else if (!returned && folderWatcherManagerIsOpen && searchManagerIsOpen) {
                _this._isOpen = true;
                _this.resume();

                internalCallback(null);
            }
        };

        this._folderWatcherManager.open(function (err) {
            folderWatcherManagerIsOpen = true;

            testOpen(err);
        });

        this._bindToFolderWatcherManagerEvents();

        this._searchManager.open(function (err) {
            searchManagerIsOpen = true;

            testOpen(err);
        });
    };

    IndexManager.prototype.pause = function (callback) {
        var internalCallback = callback || function (err) {
        };

        if (this._isIndexing) {
            this._stopIndexRunner();
            this._isIndexing = false;
        }

        return process.nextTick(internalCallback.bind(null, null));
    };

    IndexManager.prototype.resume = function (callback) {
        var internalCallback = callback || function (err) {
        };

        if (!this._isIndexing) {
            this._isIndexing = true;
            this._startIndexRunner();
        }

        return process.nextTick(internalCallback.bind(null, null));
    };

    IndexManager.prototype._bindToFolderWatcherManagerEvents = function () {
        var _this = this;
        this._folderWatcherManager.on('add', function (changedPath, stats) {
            _this.addToIndex(changedPath, stats);
            //this._triggerEvent('add', changedPath, stats);
        });
        this._folderWatcherManager.on('change', function (changedPath, stats) {
            //this._triggerEvent('change', changedPath, stats);
        });
        this._folderWatcherManager.on('unlink', function (changedPath, stats) {
            //this._triggerEvent('unlink', changedPath, stats);
        });
    };

    /**
    *
    * @private
    */
    IndexManager.prototype._indexRunner = function () {
        var keys = Object.keys(this._pendingPathsToIndex);

        if (keys.length) {
            for (var pathToIndex in this._pendingPathsToIndex) {
                this._currentPendingPathsToIndex[pathToIndex] = this._pendingPathsToIndex[pathToIndex];

                delete this._pendingPathsToIndex[pathToIndex];
            }

            this._processPendingPathsToIndex();
        }

        this._startIndexRunner();
    };

    /**
    * Creates {@link core.search.IndexManager~_indexInrrersInParallelAmount} new
    * [PendingPathProcessors]{@link @method core.search.IndexManager~_createPendingPathProcessor}
    *
    * @method core.search.IndexManager~_processPendingPathToIndex
    */
    IndexManager.prototype._processPendingPathsToIndex = function () {
        var processesStarted = 0;
        var created = true;

        while (created && processesStarted < this._indexRunnersInParallelAmount) {
            created = this._createPendingPathProcessor();

            if (created) {
                processesStarted++;
            }
        }
    };

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
    IndexManager.prototype._createPendingListObject = function (pathToIndex, stats, callback) {
        return {
            isIndexing: false,
            stats: stats,
            callback: callback || function () {
            }
        };
    };

    /**
    * Creates a path processor for all pending paths in the {@link core.search.IndexManager~_currentPendingPathsToIndex} List
    *
    * @method core.search.IndexManager~_createPendingPathProcessor
    *
    * @returns {boolean} processor successfully created
    */
    IndexManager.prototype._createPendingPathProcessor = function () {
        var _this = this;
        var pathToIndex = null;
        var pathData = null;
        var created = false;

        if (Object.keys(this._currentPendingPathsToIndex).length && this._isIndexing) {
            for (var pendingPath in this._currentPendingPathsToIndex) {
                if (!this._currentPendingPathsToIndex[pendingPath].isIndexing) {
                    pathToIndex = pendingPath;
                    pathData = this._currentPendingPathsToIndex[pendingPath];

                    break;
                }
            }

            if (pathToIndex && pathData) {
                this._processPendingPathToIndex(pathToIndex, pathData.stats, function (err) {
                    _this._indexRunnersInParallelRunning--;

                    // call callback and clean up current list
                    _this._removeCurrentPendingPathToIndex(pathToIndex, err);

                    if (_this._indexRunnersInParallelRunning < _this._indexRunnersInParallelAmount) {
                        // create a new processor
                        _this._createPendingPathProcessor();
                    }
                });

                this._indexRunnersInParallelRunning++;
                created = true;
            }
        }

        return created;
    };

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
    IndexManager.prototype._processPendingPathToIndex = function (pathToIndex, stats, callback) {
        var _this = this;
        this._currentPendingPathsToIndex[pathToIndex].isIndexing = true;

        this._getItemStatsFromSearchManager(pathToIndex, function (searchManagerHash, searchManagerStats) {
            // item exists
            if (searchManagerHash && searchManagerStats) {
                ////console.log('validating item');
                _this._validateItem(pathToIndex, searchManagerHash, searchManagerStats, function (err, isValid, fileHash, fileStats) {
                    if (isValid) {
                        // todo check against the amount of plugins which indexed this file. Maybe some plugins are new
                        callback(new Error('IndexManager~_processPendingPathToIndex: The item at path "' + pathToIndex + '" is already indexed.'));
                    } else {
                        _this._addItem(pathToIndex, stats, fileHash, callback);
                    }
                });
            } else {
                // adding new item
                _this._pathValidator.getHash(pathToIndex, function (err, fileHash) {
                    _this._addItem(pathToIndex, stats, fileHash, callback);
                });
            }
        });
    };

    /**
    * Adds an path to the Database by passing it to the {@link core.search.SearchManagerInterface#addItem} method
    *
    * @method core.search.IndexManager~_addItem
    *
    * @param {string} pathToAdd
    * @param {fs.Stats} stats
    * @param {Function} callback
    */
    IndexManager.prototype._addItem = function (pathToAdd, stats, fileHash, callback) {
        logger.debug('add item', { path: pathToAdd });

        this._searchManager.addItem(pathToAdd, stats, fileHash, function (err) {
            if (err) {
                // todo reset isIndexing flag
                return callback(err);
            }

            return callback(null);
        });
    };

    /**
    * Returns the stats and the file hash returned from the {@link core.search.IndexManagerInteface#getItem} for the given path
    *
    * @method core.search.IndexManager~_getItemStatsFromSearchManager
    *
    * @param {string} pathToIndex
    * @param {Function} callback
    */
    IndexManager.prototype._getItemStatsFromSearchManager = function (pathToIndex, callback) {
        this._searchManager.getItem(pathToIndex, function (hash, stats) {
            callback(hash, stats);
        });
    };

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
    IndexManager.prototype._validateItem = function (itemPath, searchManagerItemHash, searchManagerItemStats, callback) {
        var _this = this;
        // 1. step: validating stats
        this._pathValidator.validateStats(itemPath, searchManagerItemStats, function (err, statsAreValid, fileStats) {
            if (err) {
                return callback(err, false, null, null);
            } else if (statsAreValid) {
                return callback(null, statsAreValid, null, null);
            } else {
                // 2. step: validating file hash
                _this._pathValidator.validateHash(itemPath, searchManagerItemHash, function (err, hashIsValid, fileHash) {
                    if (err) {
                        return callback(err, false, null, null);
                    }
                    if (hashIsValid) {
                        return callback(null, hashIsValid, null, null);
                    } else {
                        return callback(null, false, fileHash, fileStats);
                    }
                });
            }
        });
    };

    /**
    * Calls the callback method stored for the path and removes it from the processing list.
    *
    * @method core.search.IndexManager~_removeCurrentPendingPathToIndex
    *
    * @param {string} pathToIndex
    * @param {Error} err
    */
    IndexManager.prototype._removeCurrentPendingPathToIndex = function (pathToIndex, err) {
        this._currentPendingPathsToIndex[pathToIndex].callback(err);

        delete this._currentPendingPathsToIndex[pathToIndex];
    };

    /**
    * Starts the index runner which starts the index process after the specified
    * {@link core.search.IndexManager~__indexRunnerDelayInMilliSeconds} delay.
    *
    * @method core.search.IndexManager~_startIndexRunner
    */
    IndexManager.prototype._startIndexRunner = function () {
        var _this = this;
        if (this._isIndexing) {
            this._indexRunnerTimeout = setTimeout(function () {
                _this._indexRunner();
            }, this._indexRunnerDelayInMilliSeconds);
        }
    };

    /**
    * Stops the previous started index runner.
    *
    * @method core.search.IndexManager~_stopIndexRunner
    */
    IndexManager.prototype._stopIndexRunner = function () {
        if (this._indexRunnerTimeout) {
            clearTimeout(this._indexRunnerTimeout);
        }
    };
    return IndexManager;
})();

module.exports = IndexManager;
//# sourceMappingURL=IndexManager.js.map
