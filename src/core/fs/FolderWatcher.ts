/// <reference path='../../main.d.ts' />

import events = require('events');
import fs = require('fs');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FolderWatcherDelayedEventInterface = require('./interfaces/FolderWatcherDelayedEventInterface');
import FolderWatcherDelayedEventListInterface = require('./interfaces/FolderWatcherDelayedEventListInterface');
import FolderWatcherDelaysInterface = require('./interfaces/FolderWatcherDelaysInterface');
import FolderWatcherInterface = require('./interfaces/FolderWatcherInterface');
import ClosableOptions = require('../utils/interfaces/ClosableOptions');
import PathListInterface = require('./interfaces/PathListInterface');

//var monitor = require('usb-detection');
var chokidar = require('chokidar');
var EventEmitter = events.EventEmitter;

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.fs.FolderWatcher
 * @implements core.fs.FolderWatcherInterface
 *
 * @param {string} pathToWatch The absolute path to the folder the watcher should manage.
 */
class FolderWatcher implements FolderWatcherInterface {

	private _config:ConfigInterface = null;

	private _currentEmptyFilePaths:PathListInterface = [];

	private _currentDelayedEvents:FolderWatcherDelayedEventListInterface = {};

	private _eventDelayOptions:FolderWatcherDelaysInterface = null;

	private _eventEmitter:events.EventEmitter = null;

	/**
	 * A flag indicates weather the watcher is open (active) or closed (inactive)
	 *
	 * @member {boolean} core.fs.FolderWatcher~_isOpen
	 */
	private _isOpen:boolean = false;

	private _options:ClosableOptions = null;

	/**
	 * The folder path the watcher is watching
	 *
	 * @member {string} core.fs.FolderWatcher~_path
	 */
	private _path:string = null;

	// todo implement chokidar.d.ts
	private _watcher:any = null;

	constructor (config:ConfigInterface, pathToWatch:string, options:ClosableOptions = {}) {
		var defaults:ClosableOptions = {
			closeOnProcessExit: true
		};

		this._config = config;
		this._path = pathToWatch;
		this._options = ObjectUtils.extend(defaults, options);

		this._eventDelayOptions = {
			interval      : this._config.get('fs.folderWatcher.interval'),
			binaryInterval: this._config.get('fs.folderWatcher.binaryInterval'),
			eventDelay    : this._config.get('fs.folderWatcher.eventDelay')
		}

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close();
			})
		}

		this.open();
	}

	public close ():void {
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
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public off (eventName:string, callback:Function):void {
		this._eventEmitter.removeListener(eventName, callback);
	}

	public on (eventName:string, callback:Function):void {
		this._eventEmitter.addListener(eventName, callback);
	}

	public open ():void {
		if (this._isOpen) {
			return;
		}

		this._eventEmitter = new EventEmitter();

		this._watcher = chokidar.watch(this._path, {
			ignored       : /[\/\\]\./,
			persistent    : true,
			interval      : this._eventDelayOptions.interval,
			binaryInterval: this._eventDelayOptions.binaryInterval
		});

		this._registerWatcherEvents();

		this._isOpen = true;
	}

	// todo bind to seperate event listeners.
	private _registerWatcherEvents ():void {
		this._watcher.on('all', (eventName:string, changedPath:string) => {
			//console.log(eventName);
			if (['add', 'change', 'unlink'].indexOf(eventName) !== -1) {
				this._processDelayedEvent(eventName, changedPath);
			}
			else if (eventName === 'addDir') {
				//console.log('added directory', this._logPath(changedPath));
			}
			else if (eventName === 'unlinkDir') {
				//console.log('removed directory', this._logPath(changedPath));
			}
			else if (eventName !== 'error') {
				//console.log('=== Undelayed Event ===');
				//console.error(eventName, changedPath);
			}
			else {
				//console.log('=== Unhandled Event ===');
				//console.error(eventName, changedPath);
			}
		});
	}

	private _processDelayedEvent (eventName:string, changedPath:string):void {
		if (!this._eventExists(changedPath)) {
			this._createDelayedEvent(eventName, changedPath);
		}
		else {
			this._updateDelayedEvent(eventName, changedPath);
		}
	}

	private _updateDelayedEvent (eventName:string, changedPath:string, timeoutIdentifier?:number) {
		var delayedEvent:FolderWatcherDelayedEventInterface = this._currentDelayedEvents[changedPath];

		if (delayedEvent) {
			this._getFileSize(changedPath, (fileSize:number, stats:fs.Stats) => {
				//console.log('- removing old event');
				clearTimeout(delayedEvent.timeout);

				//console.log('- updating properties');
				// update event name
				if (delayedEvent.eventName !== eventName) {
					//console.log('  - event name');
					this._currentDelayedEvents[changedPath].eventName = eventName;
				}

				// update fileSize
				//console.log('  - file size');
				this._currentDelayedEvents[changedPath].fileSize = fileSize;

				// update timeout function
				//console.log('  - timeout');
				timeoutIdentifier = timeoutIdentifier || this._getDelayedTriggerMethod(eventName, changedPath);
				this._currentDelayedEvents[changedPath].timeout = timeoutIdentifier;
			});
		}
	}

	/**
	 * Returns
	 * @returns {number|NodeJS.Timer}
	 */
	private _getDelayedTriggerMethod (eventName:string, changedPath:string):number {
		//console.log('  - creating delayed trigger method');
		var delay:number = this._eventDelayOptions.binaryInterval + 1000;

		return setTimeout(() => {
			//console.log('going to trigger delayed event for ' + this._logPath(changedPath));

			this._triggerDelayedEvent(eventName, changedPath);
		}, delay);
	}

	private _createDelayedEvent (eventName:string, changedPath:string, isEmptyFile:boolean = false) {
		//console.log('- creating delayed event ' + eventName + ' for ' + this._logPath(changedPath));
		this._getFileSize(changedPath, (fileSize:number, stats:fs.Stats) => {
			this._currentDelayedEvents[changedPath] = {
				eventName       : eventName,
				fileSize        : fileSize,
				initialEventName: eventName,
				isEmptyFile     : isEmptyFile,
				timeout         : this._getDelayedTriggerMethod(eventName, changedPath)
			}
		});
	}

	/**
	 * Returns the file size for the specified path or -1
	 *
	 * @param filePath
	 * @param callback
	 */
	private _getFileSize (filePath:string, callback:(fileSize:number, stats:fs.Stats) => void):void {
		fs.stat(filePath, function (err:Error, stats:fs.Stats) {
			var fileSize:number = err ? -1 : stats.size;

			callback(fileSize, stats);
		});
	}

	private _eventExists (changedPath:string):boolean {
		return this._currentDelayedEvents[changedPath] ? true : false;
	}

	private _triggerDelayedEvent (eventName:string, changedPath:string):void {
		this._updateDelayedEvent(eventName, changedPath, setTimeout(() => {
			this._getFileSize(changedPath, (fileSize:number, stats:fs.Stats) => {
				var delayedEvent:FolderWatcherDelayedEventInterface = this._currentDelayedEvents[changedPath];

				// we have a consistent file!
				if (delayedEvent.fileSize === fileSize) {

					this._deleteFromDelayedEvents(changedPath);

					if (!fileSize) {
						if (delayedEvent.isEmptyFile) {
							//console.log('File is already marked as empty. discarding...', this._logPath(changedPath));
						}
						else if (!delayedEvent.isEmptyFile && this._currentEmptyFilePaths.indexOf(changedPath) === -1) {
							//console.log('file is empty. adding to empty file paths list', this._logPath(changedPath));
							this._currentEmptyFilePaths.push(changedPath);
						}
					}
					else {
						//console.log('file has not changed (' + fileSize + ')! triggering event...');

						var emptyFilePathIndex:number = this._currentEmptyFilePaths.indexOf(changedPath);
						if (emptyFilePathIndex !== -1) {
							this._currentEmptyFilePaths.splice(emptyFilePathIndex, 1);
						}

						this._triggerEvent(delayedEvent.initialEventName, changedPath, stats);

						this._checkEmptyFilePaths();
					}
				}
				else {
					//console.log('file changed. retry...');
					this._triggerDelayedEvent(eventName, changedPath);
				}
			});
		}, this._eventDelayOptions.eventDelay));
	}

	/**
	 * Triggers the event to the outside wrold :)
	 * @param eventName
	 * @param filePath
	 * @param stats
	 * @private
	 */
	private _triggerEvent (eventName:string, filePath:string, stats:fs.Stats):void {
		//console.log("\n" + '=== EVENT ===');
		//console.log(eventName, this._logPath(filePath));
		//console.log("\n\n");

		this._eventEmitter.emit(eventName, filePath, stats);
	}

	private _deleteFromDelayedEvents (changedPath:string) {
		this._currentDelayedEvents[changedPath] = null;

		delete this._currentDelayedEvents[changedPath];
	}

	private _checkEmptyFilePaths ():void {
		// all delayed events are triggered. going to check the empty file paths.
		if (this._currentEmptyFilePaths.length && !Object.keys(this._currentDelayedEvents).length) {
			//console.log('- - - - - - Checking empty file list - - - - - - - - - -');
			//console.log(this._currentEmptyFilePaths);
			//console.log(Object.keys(this._currentDelayedEvents));

			while (this._currentEmptyFilePaths.length) {
				var filePath:string = this._currentEmptyFilePaths.pop();

				this._createDelayedEvent('add', filePath, true);
			}
		}
	}
}

export = FolderWatcher;