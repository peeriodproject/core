/// <reference path='../../main.d.ts' />
var events = require('events');
var fs = require('fs');

//var monitor = require('usb-detection');
var chokidar = require('chokidar');
var EventEmitter = events.EventEmitter;

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.fs.FolderWatcher
* @implements core.fs.FolderWatcherInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {string} pathToWatch The absolute path to the folder the watcher should manage.
* @param {core.utils.ClosableOptions} options (optional)
*/
var FolderWatcher = (function () {
    function FolderWatcher(config, appQuitHandler, pathToWatch, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used config instance
        *
        * @member {core.config.ConfigInterface} core.fs.FolderWatcher~_config
        */
        this._config = null;
        /**
        * A list of paths that refer to zero byte files. Zero byte files are generated by os x during the copy process.
        *
        * @see core.fs.FolderWatcher~_checkEmptyFilePaths
        *
        * @member {core.fs.PathListInterface} core.fs.FolderWatcher~currentEmptyFilePaths
        */
        this._currentEmptyFilePaths = [];
        /**
        * A map of delayed events
        * @type {{}}
        * @private
        */
        this._currentDelayedEvents = {};
        this._eventDelayOptions = null;
        /**
        * The event emitter instance that is used to emit changes within the folder this watcher instance is handling
        *
        * @member {events.EventEmitter} core.fs.FolderWatcher~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * A flag indicates whether the watcher is open (active) or closed (inactive)
        *
        * @member {boolean} core.fs.FolderWatcher~_isOpen
        */
        this._isOpen = false;
        /**
        * The options object
        *
        * @member {core.utils.ClosableOptions} _options
        */
        this._options = null;
        /**
        * The folder path the watcher is watching
        *
        * @member {string} core.fs.FolderWatcher~_path
        */
        this._path = null;
        // todo ts-definitions chokidar.d.ts
        this._watcher = null;
        var defaults = {
            closeOnProcessExit: true
        };

        this._config = config;
        this._path = pathToWatch;
        this._options = ObjectUtils.extend(defaults, options);

        this._eventDelayOptions = {
            interval: this._config.get('fs.folderWatcher.interval'),
            binaryInterval: this._config.get('fs.folderWatcher.binaryInterval'),
            eventDelay: this._config.get('fs.folderWatcher.eventDelay')
        };

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close();
                done();
            });
        }

        this.open();
    }
    FolderWatcher.prototype.close = function () {
        if (!this._isOpen) {
            return;
        }

        // clean up watcher
        this._watcher.close();
        this._watcher = null;

        // clean up event emitter
        this._eventEmitter.removeAllListeners();
        this._eventEmitter = null;

        this._isOpen = false;
    };

    FolderWatcher.prototype.isOpen = function () {
        return this._isOpen;
    };

    FolderWatcher.prototype.off = function (eventName, callback) {
        this._eventEmitter.removeListener(eventName, callback);
    };

    FolderWatcher.prototype.on = function (eventName, callback) {
        this._eventEmitter.addListener(eventName, callback);
    };

    FolderWatcher.prototype.open = function () {
        if (this._isOpen) {
            return;
        }

        this._eventEmitter = new EventEmitter();

        this._watcher = chokidar.watch(this._path, {
            ignored: /[\/\\]\./,
            persistent: true,
            interval: this._eventDelayOptions.interval,
            binaryInterval: this._eventDelayOptions.binaryInterval,
            usePolling: this._config.get('fs.folderWatcher.usePolling')
        });

        this._registerWatcherEvents();

        this._isOpen = true;
    };

    // todo bind to seperate event listeners.
    FolderWatcher.prototype._registerWatcherEvents = function () {
        var _this = this;
        this._watcher.on('all', function (eventName, changedPath) {
            //console.log(eventName);
            if (['add', 'change', 'unlink'].indexOf(eventName) !== -1) {
                _this._processDelayedEvent(eventName, changedPath);
            } else if (eventName === 'addDir') {
                //console.log('added directory', this._logPath(changedPath));
            } else if (eventName === 'unlinkDir') {
                //console.log('removed directory', this._logPath(changedPath));
            } else if (eventName !== 'error') {
                //console.log('=== Undelayed Event ===');
                //console.error(eventName, changedPath);
            } else {
                //console.log('=== Unhandled Event ===');
                //console.error(eventName, changedPath);
            }
        });
    };

    /**
    * Creates or updates an existing delayed event for the given eventName and path
    *
    * @method core.fs.FolderWatcher~_processDelayedEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    */
    FolderWatcher.prototype._processDelayedEvent = function (eventName, changedPath) {
        if (!this._eventExists(changedPath)) {
            this._createDelayedEvent(eventName, changedPath);
        } else {
            this._updateDelayedEvent(eventName, changedPath);
        }
    };

    /**
    * Updates the delayed event for the given event name and path by clearing the old timeout, updating the event name
    * and file size and registering a new {@link core.fs.FolderWatcher~_getDelayedTriggerMethod} in the
    * {@link core.fs.FolderWatcher~_currentDelayedEvents} list.
    *
    * @method core.fs.FolderWatcher~_updateDelayedEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @param {number} timeoutIdentifier (optional)
    */
    FolderWatcher.prototype._updateDelayedEvent = function (eventName, changedPath, timeoutIdentifier) {
        var _this = this;
        var delayedEvent = this._currentDelayedEvents[changedPath];

        if (!delayedEvent) {
            return;
        }

        this._getFileSize(changedPath, function (fileSize, stats) {
            //console.log('- removing old event');
            clearTimeout(delayedEvent.timeout);

            //console.log('- updating properties');
            // update event name
            if (delayedEvent.eventName !== eventName) {
                //console.log('  - event name');
                _this._currentDelayedEvents[changedPath].eventName = eventName;
            }

            // update fileSize
            //console.log('  - file size');
            _this._currentDelayedEvents[changedPath].fileSize = fileSize;

            // update timeout function
            //console.log('  - timeout');
            timeoutIdentifier = timeoutIdentifier || _this._getDelayedTriggerMethod(eventName, changedPath);
            _this._currentDelayedEvents[changedPath].timeout = timeoutIdentifier;
        });
    };

    /**
    * Returns the delayed {@link core.fs.FolderWatcher~_triggerDelayedEvent} function for the specified event name and path
    *
    * @method core.fs.FolderWatcher~_getDelayedTriggerMethod
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @returns {number|NodeJS.Timer}
    */
    FolderWatcher.prototype._getDelayedTriggerMethod = function (eventName, changedPath) {
        var _this = this;
        //console.log('  - creating delayed trigger method');
        var delay = this._eventDelayOptions.binaryInterval + 1000;

        return setTimeout(function () {
            //console.log('going to trigger delayed event for ' + this._logPath(changedPath));
            _this._triggerDelayedEvent(eventName, changedPath);
        }, delay);
    };

    /**
    * Creates a new delayed event for the given event name and path and registeres it in the
    * {@link core.fs.FolderWatcher~_currentDelayedEvents} list
    *
    * @method core.fs.FolderWatcher~_createDelayedEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @param {boolean} isEmptyFile (optional) default `false`
    */
    FolderWatcher.prototype._createDelayedEvent = function (eventName, changedPath, isEmptyFile) {
        var _this = this;
        if (typeof isEmptyFile === "undefined") { isEmptyFile = false; }
        //console.log('- creating delayed event ' + eventName + ' for ' + this._logPath(changedPath));
        this._getFileSize(changedPath, function (fileSize, stats) {
            _this._currentDelayedEvents[changedPath] = {
                eventName: eventName,
                fileSize: fileSize,
                initialEventName: eventName,
                isEmptyFile: isEmptyFile,
                timeout: _this._getDelayedTriggerMethod(eventName, changedPath)
            };
        });
    };

    /**
    * Returns the file size for the specified path or -1 if the file does not exist
    *
    * @method core.fs.FolderWatcher~_getFileSize
    *
    * @param filePath
    * @param callback
    */
    FolderWatcher.prototype._getFileSize = function (filePath, callback) {
        fs.stat(filePath, function (err, stats) {
            var fileSize = err ? -1 : stats.size;
            stats = stats || null;

            if (stats) {
                delete stats.atime;
            }

            callback(fileSize, stats);
        });
    };

    /**
    * Returns `true` if a event exists for the the given path
    *
    * @method core.fs.FolderWatcher~_eventExists
    *
    * @param {string} changedPath
    * @returns {boolean}
    */
    FolderWatcher.prototype._eventExists = function (changedPath) {
        return this._currentDelayedEvents[changedPath] ? true : false;
    };

    /**
    * The current event gets updated and the file will be analysed after another delay before the event gets triggered.
    *
    * @see core.fs.FolderWatcher~_checkFileAndTriggerEvent
    *
    * @method core.fs.FolderWatcher~_triggerDelayedEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    */
    FolderWatcher.prototype._triggerDelayedEvent = function (eventName, changedPath) {
        var _this = this;
        this._updateDelayedEvent(eventName, changedPath, setTimeout(function () {
            _this._getFileSize(changedPath, function (fileSize, stats) {
                _this._checkFileAndTriggerEvent(eventName, changedPath, fileSize, stats);
            });
        }, this._eventDelayOptions.eventDelay));
    };

    /**
    *
    * Checks the fole before triggering the event.
    *
    * The following cases are covered:
    *
    * 1. The file size changed:
    * A new event for further processing is created.
    *
    * 2.The file size is consistent
    * - The file is a unknown "zero byte" file it will be added to the {@link core.fs.FolderWatcher~_currentEmptyFilePaths} list for further processing.
    * - The file is a known "zero byte" file and will be ignored.
    * - The file is not empty, the event will be triggered and the path will be removed from all lists.
    *
    * @method core.fs.FolderWatcher~_checkFileAndTriggerEvent
    *
    * @param {string} eventName
    * @param {string} changedPath
    * @param {number} fileSize
    * @param {fs.Stats} stats
    */
    FolderWatcher.prototype._checkFileAndTriggerEvent = function (eventName, changedPath, fileSize, stats) {
        var delayedEvent = this._currentDelayedEvents[changedPath];

        if (delayedEvent.fileSize !== fileSize) {
            return this._triggerDelayedEvent(eventName, changedPath);
        }

        // Yeah! we have a consistent file...
        this._deleteFromDelayedEvents(changedPath);

        if (!fileSize) {
            if (!delayedEvent.isEmptyFile && this._currentEmptyFilePaths.indexOf(changedPath) === -1) {
                this._currentEmptyFilePaths.push(changedPath);
            }
        } else {
            var emptyFilePathIndex = this._currentEmptyFilePaths.indexOf(changedPath);

            if (emptyFilePathIndex !== -1) {
                this._currentEmptyFilePaths.splice(emptyFilePathIndex, 1);
            }

            this._triggerEvent(delayedEvent.initialEventName, changedPath, stats);

            this._checkEmptyFilePaths();
        }
    };

    /**
    * Triggers the event to registered event listeners
    *
    * @method core.fs.FolderWatcher~_triggerEvent
    *
    * @param {string} eventName
    * @param {string} filePath
    * @param {fs.Stats} stats
    */
    FolderWatcher.prototype._triggerEvent = function (eventName, filePath, stats) {
        //console.log("\n" + '=== EVENT ===');
        //console.log(eventName, this._logPath(filePath));
        //console.log("\n\n");
        if (this.isOpen()) {
            this._eventEmitter.emit(eventName, filePath, stats);
        }
    };

    /**
    * Removes the corresponding delayed event for the given path from the {@link core.fs.FolderWatcher~_currentDelayedEvents} list.
    *
    * @method core.fs.FolderWatcher~_deleteFromDelayedEvents
    *
    * @param {string} changedPath
    */
    FolderWatcher.prototype._deleteFromDelayedEvents = function (changedPath) {
        this._currentDelayedEvents[changedPath] = null;

        delete this._currentDelayedEvents[changedPath];
    };

    /**
    * Creates a new `add event` for all items within the {@link core.fs.FolderWatcher~_currentEmptyFilePaths} list if
    * all pending events are triggered.The files will be removed from the {@link core.fs.FolderWatcher~_currentEmptyFilePaths}
    * list and processed again.This is used to handle bulk copies on OS X as "zero byte" files won't trigger another event
    * in the filesystem after the bulk copy process is done.
    *
    * @method core.fs.FolderWatcher~_checkEmptyFilePaths
    */
    FolderWatcher.prototype._checkEmptyFilePaths = function () {
        // all delayed events are triggered. going to check the empty file paths.
        if (this._currentEmptyFilePaths.length && !Object.keys(this._currentDelayedEvents).length) {
            while (this._currentEmptyFilePaths.length) {
                var filePath = this._currentEmptyFilePaths.pop();

                this._createDelayedEvent('add', filePath, true);
            }
        }
    };
    return FolderWatcher;
})();

module.exports = FolderWatcher;
//# sourceMappingURL=FolderWatcher.js.map