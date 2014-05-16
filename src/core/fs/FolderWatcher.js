/// <reference path='../../main.d.ts' />
var fs = require('fs');

//var monitor = require('usb-detection');
var chokidar = require('chokidar');

/**
* @class core.fs.FolderWatcher
* @implements core.fs.FolderWatcherInterface
*
* @param {string} pathToWatch The absolute path to the folder the watcher should manage.
*/
var FolderWatcher = (function () {
    function FolderWatcher(config, pathToWatch) {
        this._config = null;
        this._currentEmptyFilePaths = [];
        this._currentDelayedEvents = {};
        this._eventDelayOptions = null;
        /**
        * A flag indicates weather the watcher is open (active) or closed (inactive)
        *
        * @member {boolean} core.fs.FolderWatcher~_isOpen
        */
        this._isOpen = false;
        /**
        * The folder path the watcher is watching
        *
        * @member {string} core.fs.FolderWatcher~_path
        */
        this._path = null;
        // todo implement chokidar.d.ts
        this._watcher = null;
        this._config = config;
        this._path = pathToWatch;

        this._eventDelayOptions = {
            interval: this._config.get('fs.folderWatcher.interval'),
            binaryInterval: this._config.get('fs.folderWatcher.binaryInterval'),
            eventDelay: this._config.get('fs.folderWatcher.eventDelay')
        };

        this.open();
    }
    FolderWatcher.prototype.close = function () {
        this._watcher.close();
        this._watcher = null;

        this._isOpen = false;
    };

    FolderWatcher.prototype.getState = function () {
        return undefined;
    };

    FolderWatcher.prototype.isOpen = function () {
        return this._isOpen;
    };

    FolderWatcher.prototype.open = function () {
        this._watcher = chokidar.watch(this._path, {
            ignored: /[\/\\]\./,
            persistent: true,
            interval: this._eventDelayOptions.interval,
            binaryInterval: this._eventDelayOptions.binaryInterval
        });

        this._registerEvents();

        this._isOpen = true;
    };

    FolderWatcher.prototype._registerEvents = function () {
        var _this = this;
        this._watcher.on('all', function (eventName, changedPath) {
            if (['add', 'change', 'unlink'].indexOf(eventName) !== -1) {
                _this._processDelayedEvent(eventName, changedPath);
            } else if (eventName === 'addDir') {
                //console.log('added directory', this._logPath(changedPath));
            } else if (eventName === 'unlinkDir') {
                //console.log('removed directory', this._logPath(changedPath));
            } else if (eventName !== 'error') {
                console.log('=== Undelayed Event ===');
                console.error(eventName, changedPath);
                //this._processEvent(eventName, changedPath);
            } else {
                console.log('=== Unhandled Event ===');
                console.error(eventName, changedPath);
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

    FolderWatcher.prototype._logPath = function (filePath) {
        return '"' + filePath.replace('/Volumes/HDD/Users/joernroeder/Projects/__Abschluss__/git_app/test/fixtures/core/fs/folderWatcherTest/folderToWatch/', '') + '"';
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

    FolderWatcher.prototype._eventExists = function (changedPath) {
        return this._currentDelayedEvents[changedPath] ? true : false;
    };

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

                        _this._triggerEvent(eventName, changedPath, stats);

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
    * Triggers the event to the outside wrold :)
    * @param eventName
    * @param filePath
    * @param stats
    * @private
    */
    FolderWatcher.prototype._triggerEvent = function (eventName, filePath, stats) {
        console.log("\n" + '=== EVENT ===');
        console.log(eventName, this._logPath(filePath));
        console.log("\n\n");
    };

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
