/// <reference path='../../main.d.ts' />
var events = require('events');
var fs = require('fs-extra');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

var EventEmitter = events.EventEmitter;

/**
* @class core.fs.FolderWatcherManager
* @implements core.fs.FolderWatcherManagerInterface
*/
var FolderWatcherManager = (function () {
    function FolderWatcherManager(config, stateHandlerFactory, folderWatcherFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        this._config = null;
        this._eventEmitter = null;
        this._folderWatcherFactory = null;
        /**
        * Contains invalid absolute paths that are (currently) not available in the file system.
        *
        *
        */
        this._invalidWatcherPaths = [];
        this._isOpen = false;
        this._options = null;
        /**
        *
        * @member {core.utils.StateHandlerInterface} core.fs.FolderWatcherManager~_stateLoader
        */
        this._stateHandler = null;
        /**
        *
        * @member {core.fs.FolderWatcherListInterface} core.fs.FolderWatcherManager~_watchers
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
        this._folderWatcherFactory = folderWatcherFactory;
        this._options = ObjectUtils.extend(defaults, options);

        var statePath = path.resolve(this._config.get('app.dataPath'), 'FolderWatcherManager.json');
        this._stateHandler = stateHandlerFactory.create(statePath);

        if (this._options.closeOnProcessExit) {
            process.on('exit', function () {
                _this.close();
            });
        }

        this.open();
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
                for (var i in invalidPaths) {
                    var invalidPath = invalidPaths[i];
                    var removed = false;

                    removed = _this._removeFolderWatcher(invalidPath);

                    if (removed) {
                        _this._addToInvalidWatcherPaths(invalidPath);
                    }
                }
            }

            checkedInvalidPaths = true;
            callbackCheck();
        });

        // check invalid Paths
        this._checkFolderWatcherPaths(this._invalidWatcherPaths, function (err, invalidPaths, validPaths) {
            if (validPaths && validPaths.length) {
                for (var i in validPaths) {
                    var validPath = validPaths[i];

                    _this._createWatcher(validPath);
                }
            }

            checkedValidPaths = true;
            callbackCheck();
        });
    };

    FolderWatcherManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._eventEmitter.removeAllListeners();
        this._eventEmitter = null;

        for (var pathToWatch in this._watchers) {
            this._watchers[pathToWatch].close();
        }

        this._stateHandler.save(Object.keys(this._watchers), function (err) {
            _this._isOpen = false;
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
                    internalCallback(err);
                } else {
                    if (invalidPaths && invalidPaths.length) {
                        for (var i in invalidPaths) {
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
                        return internalCallback(null);
                    }
                }
            });
        });
    };

    FolderWatcherManager.prototype.removeFolderWatcher = function (pathToWatch, callback) {
        var internalCallback = callback || function () {
        };

        this._removeFolderWatcher(pathToWatch);

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
            this._invalidWatcherPaths.push(pathToWatch);
        }
    };

    /**
    * Binds to the add, change and unlink event from the file watcher and triggers the corresponding event.
    *
    * todo Add the ability to detect file movements a rename operations
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

        for (var i in pathsToWatch) {
            var pathToWatch = pathsToWatch[i];

            if (!this._isAbsolutePath(pathToWatch)) {
                err = new Error('FolderWatcherManager~_checkFolderWatcherPaths: The specified path is not absolute. "' + pathToWatch + '"');
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
            callback(err, null, null);
        } else {
            callback(null, invalidPaths, validPaths);
        }
    };

    FolderWatcherManager.prototype._createWatchers = function (pathsToWatch, callback) {
        if (!pathsToWatch || !Array.isArray(pathsToWatch) || !pathsToWatch.length) {
            return callback(null);
        }

        for (var i in pathsToWatch) {
            var pathToWatch = pathsToWatch[i];

            this._createWatcher(pathToWatch);
        }

        callback(null);
    };

    /**
    * Creates a watcher for the specified (valid) path
    *
    * @param {string} pathToWatch
    * @returns {boolean}
    */
    FolderWatcherManager.prototype._createWatcher = function (pathToWatch) {
        var created = false;

        if (!this._watchers[pathToWatch] && fs.existsSync(pathToWatch)) {
            this._watchers[pathToWatch] = this._folderWatcherFactory.create(this._config, pathToWatch);
            this._removeFromInvalidWatcherPaths(pathToWatch);

            this._bindToWatcherEvents(this._watchers[pathToWatch]);

            created = true;
        }

        return created;
    };

    FolderWatcherManager.prototype._getActiveWatcherPaths = function () {
        return Object.keys(this._watchers);
    };

    FolderWatcherManager.prototype._isAbsolutePath = function (aPath) {
        return path.resolve(aPath) === aPath;
    };

    /**
    * Removes an active folder watcher
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
    */
    FolderWatcherManager.prototype._removeFromInvalidWatcherPaths = function (pathToWatch) {
        var index = this._invalidWatcherPaths.indexOf(pathToWatch);

        if (index !== -1) {
            this._invalidWatcherPaths.splice(index, 1);
        }
    };

    FolderWatcherManager.prototype._triggerEvent = function (eventName, changedPath, stats) {
        if (this._isOpen) {
            this._eventEmitter.emit(eventName, changedPath, stats);
        }
    };

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
