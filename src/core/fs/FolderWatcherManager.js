/// <reference path='../../main.d.ts' />
var events = require('events');
var fs = require('fs-extra');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

var EventEmitter = events.EventEmitter;

/**
* @class core.fs.FolderWatcherManager
* @implements core.fs.FolderWatcherManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.utils.StateHandlerFactoryInterface} stateHandlerFactory
* @param {core.fs.FolderWatcherFactoryInterface} folderWatcherFactory
* @param {core.utils.ClosableAsyncOptions} options
*/
var FolderWatcherManager = (function () {
    function FolderWatcherManager(config, appQuitHandler, stateHandlerFactory, folderWatcherFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used appQuitHandler instance
        *
        * @member {core.utils.AppQuitHandler} core ~_appQuitHandler
        */
        this._appQuitHandler = null;
        /**
        * Returns whether the FolderWatcherManager is already closing or not
        *
        * @member {core.utils.AppQuitHandler} core ~_isClosing
        */
        this._isClosing = false;
        /**
        * The internally used config instance
        *
        * @member {core.config.ConfigInterface} core.fs.FolderWatcherManager~_config
        */
        this._config = null;
        /**
        * The EventEmitter instance used to emit events.
        *
        * @see Use {@link core.fs.FolderWatcherManager#on} and {@link core.fs.FolderWatcherManager#off} to (un)bind your listeners to the emitter
        *
        * @member {events.EventEmitter} core.fs.FolderWatcherManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * The internally used FolderWatcherFactory
        *
        * @member {core.fs.FolderWatcherFactoryInterface} core.fs.FolderWatcherManager~_folderWatcherFactory
        */
        this._folderWatcherFactory = null;
        /**
        * Contains invalid absolute paths that are (currently) not available in the file system.
        *
        * @member {core.fs.PathListInterface} core.fs.FolderWatcherManager~_invalidWatcherPaths
        */
        this._invalidWatcherPaths = [];
        this._isOpen = false;
        /**
        *
        * @member {core.utils.ClosableAsyncOptions} core.fs.FolderWatcherManager~_options
        */
        this._options = null;
        /**
        * The internally used StateHandler to save and load the current set of folders to watch.
        *
        * @member {core.utils.StateHandlerInterface} core.fs.FolderWatcherManager~_stateHandler
        */
        this._stateHandler = null;
        /**
        * The list of currently active {@link core.fs.FolderWatcherInteface} instances
        *
        * @member {core.fs.FolderWatcherMapInterface} core.fs.FolderWatcherManager~_watchers
        */
        this._watchers = null;
        var defaults = {
            closeOnProcessExit: true,
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._appQuitHandler = appQuitHandler;
        this._folderWatcherFactory = folderWatcherFactory;
        this._options = ObjectUtils.extend(defaults, options);

        var statePath = path.resolve(this._config.get('app.dataPath'), 'FolderWatcherManager.json');
        this._stateHandler = stateHandlerFactory.create(statePath);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
        /*monitor.find(function(err, devices) {
        console.log('- - FOUND - -');
        console.log(err);
        console.log(devices);
        });
        
        monitor.on('add', function(err, devices) {
        console.log('- - ADDED - -');
        console.log(err);
        console.log(devices);
        });
        
        monitor.on('change', function(err, devices) {
        console.log('- - CHANGE - -');
        console.log(err);
        console.log(devices);
        });
        
        monitor.on('remove', function(err, devices) {
        console.log('- - REMOVED - -');
        console.log(err);
        console.log(devices);
        });*/
    }
    FolderWatcherManager.prototype.addFolderWatcher = function (pathToWatch, callback) {
        var internalCallback = callback || function (err) {
        };

        this._createWatcher(pathToWatch);

        return process.nextTick(internalCallback.bind(null, null));
    };

    FolderWatcherManager.prototype.checkFolderWatcherPaths = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };
        var checkedInvalidPaths;
        var checkedValidPaths;
        var callbackCheck = function () {
            if (checkedInvalidPaths && checkedValidPaths) {
                return process.nextTick(internalCallback.bind(null));
            }
        };

        // check active watchers
        this._checkFolderWatcherPaths(this._getActiveWatcherPaths(), function (err, invalidPaths, validPaths) {
            if (invalidPaths && invalidPaths.length) {
                for (var i = 0, l = invalidPaths.length; i < l; i++) {
                    var invalidPath = invalidPaths[i];
                    var removed = false;

                    removed = _this._removeFolderWatcher(invalidPath);

                    if (removed) {
                        _this._addToInvalidWatcherPaths(invalidPath);
                    }
                }
            }

            checkedInvalidPaths = true;

            return callbackCheck();
        });

        // check invalid Paths
        this._checkFolderWatcherPaths(this._invalidWatcherPaths, function (err, invalidPaths, validPaths) {
            if (validPaths && validPaths.length) {
                for (var i = 0, l = validPaths.length; i < l; i++) {
                    var validPath = validPaths[i];

                    _this._createWatcher(validPath);
                }
            }

            checkedValidPaths = true;
            return callbackCheck();
        });
    };

    FolderWatcherManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen || this._isClosing) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        if (this._eventEmitter) {
            this._eventEmitter.removeAllListeners();
            this._eventEmitter = null;
        }

        if (this._watchers) {
            for (var pathToWatch in this._watchers) {
                this._watchers[pathToWatch].close();
            }
        }

        this._isClosing = true;
        this._stateHandler.save(this._getState(), function (err) {
            _this._isOpen = false;
            _this._isClosing = false;
            _this._watchers = null;

            return process.nextTick(internalCallback.bind(null, err));
        });
    };

    FolderWatcherManager.prototype.getFolderWatchers = function (callback) {
        return process.nextTick(callback.bind(null, this._watchers));
    };

    FolderWatcherManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    FolderWatcherManager.prototype.off = function (eventName, callback) {
        this._eventEmitter.removeListener(eventName, callback);
    };

    FolderWatcherManager.prototype.on = function (eventName, callback) {
        this._eventEmitter.addListener(eventName, callback);
    };

    FolderWatcherManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = function (err) {
            var _callback = callback || _this._options.onOpenCallback;

            return process.nextTick(_callback.bind(null, err));
        };

        if (this._isOpen) {
            return internalCallback(null);
        }

        this._eventEmitter = new EventEmitter();

        this._watchers = {};

        this._stateHandler.load(function (err, data) {
            var pathsToWatch = (data && data['paths']) ? data['paths'] : null;

            if (pathsToWatch === null || !Array.isArray(pathsToWatch) || !pathsToWatch.length) {
                _this._isOpen = true;

                return internalCallback(null);
            }

            _this._checkFolderWatcherPaths(pathsToWatch, function (err, invalidPaths, validPaths) {
                if (err) {
                    return internalCallback(err);
                }

                if (invalidPaths && invalidPaths.length) {
                    for (var i = 0, l = invalidPaths.length; i < l; i++) {
                        _this._addToInvalidWatcherPaths(invalidPaths[i]);
                    }
                }

                if (validPaths && validPaths.length) {
                    _this._createWatchers(validPaths, function (err) {
                        if (!err) {
                            _this._isOpen = true;
                        }

                        return internalCallback(err);
                    });
                } else {
                    _this._isOpen = true;

                    return internalCallback(null);
                }
            });
        });
    };

    FolderWatcherManager.prototype.removeFolderWatcher = function (pathToWatch, callback) {
        var internalCallback = callback || function () {
        };
        var removed = false;

        removed = this._removeFolderWatcher(pathToWatch);

        if (removed) {
            this._triggerEvent('watcher.remove', pathToWatch, null);
        } else {
            removed = this._removeFromInvalidWatcherPaths(pathToWatch);

            if (removed) {
                this._triggerEvent('watcher.removeInvalid', pathToWatch, null);
            }
        }

        return process.nextTick(internalCallback.bind(null, null));
    };

    /**
    * Adds a path to the {@link core.fs.FolderWatcherManager~_invalidWatcherPaths} list.
    *
    * @method core.fs.FolderWatcherManager~_addToInvalidWatcherPaths
    *
    * @param {string} pathToWatch
    */
    FolderWatcherManager.prototype._addToInvalidWatcherPaths = function (pathToWatch) {
        if (this._invalidWatcherPaths.indexOf(pathToWatch) === -1) {
            this._forceTriggerEvent('watcher.invalid', pathToWatch, null);
            this._invalidWatcherPaths.push(pathToWatch);
        }
    };

    /**
    * Binds to the add, change and unlink event from the file watcher and triggers the corresponding event.
    *
    * todo Add the ability to detect file movements and rename operations
    *
    * @method core.fs.FolderWatcherManager~_bindToWatcherEvents
    *
    * @param {core.fs.FolderWatcherInterface} watcher
    */
    FolderWatcherManager.prototype._bindToWatcherEvents = function (watcher) {
        var _this = this;
        watcher.on('add', function (changedPath, stats) {
            _this._triggerEvent('add', changedPath, stats);
        });
        watcher.on('change', function (changedPath, stats) {
            _this._triggerEvent('change', changedPath, stats);
        });
        watcher.on('unlink', function (changedPath, stats) {
            _this._triggerEvent('unlink', changedPath, stats);
        });
    };

    FolderWatcherManager.prototype._checkFolderWatcherPaths = function (pathsToWatch, callback) {
        var validPaths = [];
        var invalidPaths = [];
        var err = null;

        for (var i = 0, l = pathsToWatch.length; i < l; i++) {
            var pathToWatch = pathsToWatch[i];

            if (!this._isAbsolutePath(pathToWatch)) {
                err = new Error('FolderWatcherManager~_checkFolderWatcherPaths: The specified path is not an absolute path. "' + pathToWatch + '"');
                break;
            }

            // check existance and add to invalid or valid path list
            if (!fs.existsSync(pathToWatch)) {
                invalidPaths.push(pathToWatch);
            } else if (validPaths.indexOf(pathToWatch) === -1) {
                validPaths.push(pathToWatch);
            }
        }

        if (err) {
            invalidPaths = validPaths = null;
        }

        return callback(err, invalidPaths, validPaths);
    };

    /**
    * Creates {@link core.fs.FolderWatcherInterface} for the specified paths and calls the callback afterwards.
    *
    * @see core.fs.FolderWatcherManager~_createWatcher
    *
    * @method core.fs.FolderWatcherManager~_createWatchers
    *
    * @param {core.fs.PathListInterface} pathsToWatch
    * @param {Function} callback
    */
    FolderWatcherManager.prototype._createWatchers = function (pathsToWatch, callback) {
        if (!pathsToWatch || !Array.isArray(pathsToWatch) || !pathsToWatch.length) {
            return callback(null);
        }

        for (var i = 0, l = pathsToWatch.length; i < l; i++) {
            var pathToWatch = pathsToWatch[i];

            this._createWatcher(pathToWatch);
        }

        callback(null);
    };

    /**
    * Creates a watcher for the specified (valid) path
    *
    * @method core.fs.FolderWatcherManager~_createWatcher
    *
    * @param {string} pathToWatch
    * @returns {boolean}
    */
    FolderWatcherManager.prototype._createWatcher = function (pathToWatch) {
        var created = false;

        if (!this._watchers[pathToWatch] && fs.existsSync(pathToWatch)) {
            this._watchers[pathToWatch] = this._folderWatcherFactory.create(this._config, this._appQuitHandler, pathToWatch);
            this._removeFromInvalidWatcherPaths(pathToWatch);

            this._bindToWatcherEvents(this._watchers[pathToWatch]);

            this._forceTriggerEvent('watcher.add', pathToWatch, null);
            created = true;
        }

        return created;
    };

    /**
    * Emits the specified event
    *
    * @method core.fs.FolderWatcherManager~_forceTriggerEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @param {fs.Stats} stats
    */
    FolderWatcherManager.prototype._forceTriggerEvent = function (eventName, changedPath, stats) {
        this._eventEmitter.emit(eventName, changedPath, stats);
    };

    /**
    * Returns an array of currently paths that are currently spied on.
    *
    * @method core.fs.FolderWatcherManager~_getActiveWatcherPaths
    *
    * @returns {core.fs.PathListInterface}
    */
    FolderWatcherManager.prototype._getActiveWatcherPaths = function () {
        return Object.keys(this._watchers);
    };

    /**
    * Returns the state that will be saved with the {@link core.fs.FolderWatcherManager~_stateHandler}
    *
    * @method core.fs.FolderWatcherManager~_getState
    *
    * @returns {Object}
    */
    FolderWatcherManager.prototype._getState = function () {
        return {
            paths: Object.keys(this._watchers).concat(this._invalidWatcherPaths)
        };
    };

    /**
    * Returns `true` if the specified path is absolute
    *
    * @method core.fs.FolderWatcherManager~_isAbsolutePath
    *
    * @param {string} aPath
    * @returns {boolean}
    */
    FolderWatcherManager.prototype._isAbsolutePath = function (aPath) {
        return path.resolve(aPath) === aPath;
    };

    /**
    * Removes an active folder watcher from the manager and triggers the corresponding `watcher.remove` event
    *
    * @method core.fs.FolderWatcherManager~_removeFolderWatcher
    *
    * @param {string} pathToWatch
    * @returns {boolean} `true` if successfully removed
    */
    FolderWatcherManager.prototype._removeFolderWatcher = function (pathToWatch) {
        var removed = false;

        if (this._watcherExists(pathToWatch)) {
            this._watchers[pathToWatch].close();

            this._watchers[pathToWatch] = null;
            delete this._watchers[pathToWatch];

            removed = true;
        }

        return removed;
    };

    /**
    * Adds a path to the {@link core.fs.FolderWatcherManager~_invalidWatcherPaths} list.
    *
    * @method core.fs.FolderWatcherManager~_addToInvalidWatcherPaths
    *
    * @param {string} pathToWatch
    * @returns {boolean} successfully removed
    */
    FolderWatcherManager.prototype._removeFromInvalidWatcherPaths = function (pathToWatch) {
        var index = this._invalidWatcherPaths.indexOf(pathToWatch);
        var removed = false;

        if (index !== -1) {
            this._invalidWatcherPaths.splice(index, 1);
            removed = true;
        }

        return removed;
    };

    /**
    * Triggers the specified event if the FolderWatcherManager is (still) open
    *
    * @method core.fs.FolderWatcherManager~_triggerEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @param {fs.Stats} stats
    */
    FolderWatcherManager.prototype._triggerEvent = function (eventName, changedPath, stats) {
        if (this._isOpen) {
            this._forceTriggerEvent(eventName, changedPath, stats);
        }
    };

    /**
    * Returns `true` if a watcher for the specified path exists.
    *
    * @method core.fs.FolderWatcherManager~_watcherExists
    *
    * @param {string} pathToWatch
    * @returns {boolean}
    */
    FolderWatcherManager.prototype._watcherExists = function (pathToWatch) {
        return this._watchers[pathToWatch] ? true : false;
    };
    return FolderWatcherManager;
})();

module.exports = FolderWatcherManager;
/*
- - FOUND - -
undefined
[ { locationId: 605167616,
vendorId: 1452,
productId: 545,
deviceName: 'Apple Keyboard',
manufacturer: 'Apple, Inc',
serialNumber: '',
deviceAddress: 8 },
{ locationId: 605421568,
vendorId: 1452,
productId: 37414,
deviceName: 'Apple LED Cinema Display',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 6 },
{ locationId: 608174080,
vendorId: 1452,
productId: 34055,
deviceName: 'Built-in iSight',
manufacturer: 'Apple Inc.',
serialNumber: '8H8A701MG40Y3L00',
deviceAddress: 3 },
{ locationId: 605290496,
vendorId: 1452,
productId: 4357,
deviceName: 'Display Audio',
manufacturer: 'Apple Inc.',
serialNumber: '27641E02',
deviceAddress: 5 },
{ locationId: 605356032,
vendorId: 1452,
productId: 34056,
deviceName: 'Display iSight',
manufacturer: 'Apple Inc.',
serialNumber: '8JA891T4JBRZ3A00',
deviceAddress: 4 },
{ locationId: 603979776,
vendorId: 1452,
productId: 32774,
deviceName: 'EHCI Root Hub Simulation',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 1 },
{ locationId: 605028352,
vendorId: 1452,
productId: 37158,
deviceName: 'HubDevice',
manufacturer: '',
serialNumber: '',
deviceAddress: 2 },
{ locationId: 605159424,
vendorId: 1452,
productId: 4102,
deviceName: 'Keyboard Hub',
manufacturer: 'Apple, Inc.',
serialNumber: '000000000000',
deviceAddress: 7 },
{ locationId: 605224960,
vendorId: 1452,
productId: 4776,
deviceName: 'iPhone',
manufacturer: 'Apple Inc.',
serialNumber: 'a9e6a803823118657c388d95b53625c5746933d8',
deviceAddress: 9 },
{ locationId: 637534208,
vendorId: 1452,
productId: 32774,
deviceName: 'EHCI Root Hub Simulation',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 1 },
{ locationId: 639631360,
vendorId: 4871,
productId: 357,
deviceName: 'USB Mass Storage Device',
manufacturer: 'USBest Technology',
serialNumber: 'f761e46097e70c',
deviceAddress: 2 },
{ locationId: 73400320,
vendorId: 1452,
productId: 567,
deviceName: 'Apple Internal Keyboard / Trackpad',
manufacturer: 'Apple, Inc.',
serialNumber: '',
deviceAddress: 3 },
{ locationId: 72351744,
vendorId: 1452,
productId: 33346,
deviceName: 'IR Receiver',
manufacturer: 'Apple Computer, Inc.',
serialNumber: '',
deviceAddress: 2 },
{ locationId: 67108864,
vendorId: 1452,
productId: 32773,
deviceName: 'OHCI Root Hub Simulation',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 1 },
{ locationId: 101711872,
vendorId: 2652,
productId: 17664,
deviceName: 'BRCM2046 Hub',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 2 },
{ locationId: 101777408,
vendorId: 1452,
productId: 33299,
deviceName: 'Bluetooth USB Host Controller',
manufacturer: 'Apple Inc.',
serialNumber: '0023125CAC85',
deviceAddress: 5 },
{ locationId: 100663296,
vendorId: 1452,
productId: 32773,
deviceName: 'OHCI Root Hub Simulation',
manufacturer: 'Apple Inc.',
serialNumber: '',
deviceAddress: 1 } ]
- - REMOVED - -
{ locationId: 639631360,
vendorId: 4871,
productId: 357,
deviceName: 'USB Mass Storage Device',
manufacturer: 'USBest Technology',
serialNumber: 'f761e46097e70c',
deviceAddress: 2 }
undefined
- - CHANGE - -
{ locationId: 639631360,
vendorId: 4871,
productId: 357,
deviceName: 'USB Mass Storage Device',
manufacturer: 'USBest Technology',
serialNumber: 'f761e46097e70c',
deviceAddress: 2 }
undefined
- - ADDED - -
{ locationId: 639631360,
vendorId: 4871,
productId: 357,
deviceName: 'USB Mass Storage Device',
manufacturer: 'USBest Technology',
serialNumber: 'f761e46097e70c',
deviceAddress: 2 }
undefined
- - CHANGE - -
{ locationId: 639631360,
vendorId: 4871,
productId: 357,
deviceName: 'USB Mass Storage Device',
manufacturer: 'USBest Technology',
serialNumber: 'f761e46097e70c',
deviceAddress: 2 }
undefined
*/
//# sourceMappingURL=FolderWatcherManager.js.map
