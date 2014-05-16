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
* @param {string} pathToWatch The absolute path to the folder the watcher should manage.
*/
var FolderWatcher = (function () {
    function FolderWatcher(config, pathToWatch, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        this._config = null;
        this._currentEmptyFilePaths = [];
        this._currentDelayedEvents = {};
        this._eventDelayOptions = null;
        this._eventEmitter = null;
        /**
        * A flag indicates weather the watcher is open (active) or closed (inactive)
        *
        * @member {boolean} core.fs.FolderWatcher~_isOpen
        */
        this._isOpen = false;
        this._options = null;
        /**
        * The folder path the watcher is watching
        *
        * @member {string} core.fs.FolderWatcher~_path
        */
        this._path = null;
        // todo implement chokidar.d.ts
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
            process.on('exit', function () {
                _this.close();
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
            binaryInterval: this._eventDelayOptions.binaryInterval
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

    FolderWatcher.prototype._processDelayedEvent = function (eventName, changedPath) {
        if (!this._eventExists(changedPath)) {
            this._createDelayedEvent(eventName, changedPath);
        } else {
            this._updateDelayedEvent(eventName, changedPath);
        }
    };

    FolderWatcher.prototype._updateDelayedEvent = function (eventName, changedPath, timeoutIdentifier) {
        var _this = this;
        var delayedEvent = this._currentDelayedEvents[changedPath];

        if (delayedEvent) {
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
        }
    };

    /**
    * Returns
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
    * Returns the file size for the specified path or -1
    *
    * @param filePath
    * @param callback
    */
    FolderWatcher.prototype._getFileSize = function (filePath, callback) {
        fs.stat(filePath, function (err, stats) {
            var fileSize = err ? -1 : stats.size;

            callback(fileSize, stats);
        });
    };

    /**
    * Returns true if a event exists for the the given path
    *
    * @param {string} changedPath
    * @returns {boolean}
    */
    FolderWatcher.prototype._eventExists = function (changedPath) {
        return this._currentDelayedEvents[changedPath] ? true : false;
    };

    /**
    *
    * @param eventName
    * @param changedPath
    * @private
    */
    FolderWatcher.prototype._triggerDelayedEvent = function (eventName, changedPath) {
        var _this = this;
        this._updateDelayedEvent(eventName, changedPath, setTimeout(function () {
            _this._getFileSize(changedPath, function (fileSize, stats) {
                var delayedEvent = _this._currentDelayedEvents[changedPath];

                // we have a consistent file!
                if (delayedEvent.fileSize === fileSize) {
                    _this._deleteFromDelayedEvents(changedPath);

                    if (!fileSize) {
                        if (delayedEvent.isEmptyFile) {
                            //console.log('File is already marked as empty. discarding...', this._logPath(changedPath));
                        } else if (!delayedEvent.isEmptyFile && _this._currentEmptyFilePaths.indexOf(changedPath) === -1) {
                            //console.log('file is empty. adding to empty file paths list', this._logPath(changedPath));
                            _this._currentEmptyFilePaths.push(changedPath);
                        }
                    } else {
                        //console.log('file has not changed (' + fileSize + ')! triggering event...');
                        var emptyFilePathIndex = _this._currentEmptyFilePaths.indexOf(changedPath);
                        if (emptyFilePathIndex !== -1) {
                            _this._currentEmptyFilePaths.splice(emptyFilePathIndex, 1);
                        }

                        _this._triggerEvent(delayedEvent.initialEventName, changedPath, stats);

                        _this._checkEmptyFilePaths();
                    }
                } else {
                    //console.log('file changed. retry...');
                    _this._triggerDelayedEvent(eventName, changedPath);
                }
            });
        }, this._eventDelayOptions.eventDelay));
    };

    /**
    * Triggers the event to registered event listeners.
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
    *
    * @param changedPath
    * @private
    */
    FolderWatcher.prototype._deleteFromDelayedEvents = function (changedPath) {
        this._currentDelayedEvents[changedPath] = null;

        delete this._currentDelayedEvents[changedPath];
    };

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
