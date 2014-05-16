/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');
import path = require('path');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FolderWatcherManagerInterface = require('./interfaces/FolderWatcherManagerInterface');
import PathListInterface = require('./interfaces/PathListInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.fs.FolderWatcherManager
 * @implements core.fs.FolderWatcherManagerInterface
 */
class FolderWatcherManager implements FolderWatcherManagerInterface {
	private _config:ConfigInterface = null;

	// todo :FolderWatcherFactoryInterface
	private _folderWatcherFactory:any = null;

	/**
	 * Contains invalid absolute paths that are (currently) not available in the file system.
	 *
	 *
	 */
	private _invalidWatcherPaths:PathListInterface = [];

	private _isOpen:boolean = false;

	private _options:ClosableAsyncOptions = null;

	/**
	 *
	 * @member {core.utils.StateHandlerInterface} core.fs.FolderWatcherManager~_statLoader
	 */
	private _stateHandler:StateHandlerInterface = null;

	// todo :FolderWatcherListInterface
	private _watchers:any = null;

	constructor (config:ConfigInterface, stateLoaderFactory:StateHandlerFactoryInterface, folderWatcherFactory:any, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._folderWatcherFactory = folderWatcherFactory;
		this._options = ObjectUtils.extend(defaults, options);

		var statePath:string = path.resolve(this._config.get('app.dataPath'), 'FolderWatcherManager.json');
		this._stateHandler = stateLoaderFactory.create(statePath);

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close();
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

	public addFolderWatcher (pathToWatch:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._createWatcher(pathToWatch);

		return process.nextTick(internalCallback.bind(null, null));
	}

	public checkFolderWatcherPaths (callback?:() => any):void {
		var internalCallback = callback || function () {
		};
		var checkedInvalidPaths:boolean;
		var checkedValidPaths:boolean;
		var callbackCheck:Function = function () {
			if (checkedInvalidPaths && checkedValidPaths) {
				return process.nextTick(internalCallback.bind(null));
			}
		};

		// check active watchers
		this._checkFolderWatcherPaths(this._getActiveWatcherPaths(), (err:Error, invalidPaths:PathListInterface, validPaths:PathListInterface) => {
			if (invalidPaths && invalidPaths.length) {
				for (var i in invalidPaths) {
					var invalidPath:string = invalidPaths[i];
					var removed:boolean = false;

					removed = this._removeFolderWatcher(invalidPath);

					if (removed) {
						this._addToInvalidWatcherPaths(invalidPath);
					}
				}
			}

			checkedInvalidPaths = true;
			callbackCheck();
		});

		// check invalid Paths
		this._checkFolderWatcherPaths(this._invalidWatcherPaths, (err:Error, invalidPaths:PathListInterface, validPaths:PathListInterface) => {
			if (validPaths && validPaths.length) {
				for (var i in validPaths) {
					var validPath:string = validPaths[i];

					this._createWatcher(validPath);
				}
			}

			checkedValidPaths = true;
			callbackCheck();
		});
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		for (var pathToWatch in this._watchers) {
			this._watchers[pathToWatch].close();
		}

		this._stateHandler.save(Object.keys(this._watchers), (err:Error) => {
			this._isOpen = false;
			this._watchers = null;

			return process.nextTick(internalCallback.bind(null, err));
		});
	}

	public getFolderWatchers (callback:(folderWatchers:any) => any):any {
		return process.nextTick(callback.bind(null, this._watchers));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback:Function = (err:Error) => {
			var _callback:Function = callback || this._options.onOpenCallback;

			return process.nextTick(_callback.bind(null, err));
		}

		if (this._isOpen) {
			return internalCallback(null);
		}

		this._watchers = {};

		this._stateHandler.load((err:Error, data:Object) => {
			var pathsToWatch:PathListInterface = (data && data['paths']) ? data['paths'] : null;

			if (pathsToWatch === null || !Array.isArray(pathsToWatch) || !pathsToWatch.length) {
				this._isOpen = true;

				return internalCallback(null);
			}

			this._checkFolderWatcherPaths(pathsToWatch, (err:Error, invalidPaths:PathListInterface, validPaths:PathListInterface) => {
				if (err) {
					internalCallback(err);
				}
				else {
					if (invalidPaths && invalidPaths.length) {
						for (var i in invalidPaths) {
							this._addToInvalidWatcherPaths(invalidPaths[i]);
						}
					}

					if (validPaths && validPaths.length) {
						this._createWatchers(validPaths, (err:Error) => {
							if (!err) {
								this._isOpen = true;
							}

							return internalCallback(err);
						});
					}
					else {
						return internalCallback(null);
					}
				}
			});
		});
	}

	public removeFolderWatcher (pathToWatch:string, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		this._removeFolderWatcher(pathToWatch);

		return process.nextTick(internalCallback.bind(null, null));
	}

	/**
	 * Adds a path to the {@link core.fs.FolderWatcherManager~_invalidWatcherPaths} list.
	 *
	 * @method core.fs.FolderWatcherManager~_addToInvalidWatcherPaths
	 *
	 * @param {string} pathToWatch
	 */
	private _addToInvalidWatcherPaths (pathToWatch:string):void {
		if (this._invalidWatcherPaths.indexOf(pathToWatch) === -1) {
			this._invalidWatcherPaths.push(pathToWatch);
		}
	}

	private _checkFolderWatcherPaths (pathsToWatch:PathListInterface, callback:(err:Error, invalidPaths:PathListInterface, validPaths:PathListInterface) => any):void {
		var validPaths:PathListInterface = [];
		var invalidPaths:PathListInterface = [];
		var err:Error = null;

		for (var i in pathsToWatch) {
			var pathToWatch:string = pathsToWatch[i];

			if (!this._isAbsolutePath(pathToWatch)) {
				err = new Error('FolderWatcherManager~_checkFolderWatcherPaths: The specified path is not absolute. "' + pathToWatch + '"');
				break;
			}

			// check existance and add to invalid or valid path list
			if (!fs.existsSync(pathToWatch)) {
				invalidPaths.push(pathToWatch);
			}
			else if (validPaths.indexOf(pathToWatch) === -1) {
				validPaths.push(pathToWatch);
			}

		}

		if (err) {
			callback(err, null, null);
		}
		else {
			callback(null, invalidPaths, validPaths);
		}
	}

	private _createWatchers (pathsToWatch:PathListInterface, callback:(err:Error) => any):void {

		if (!pathsToWatch || !Array.isArray(pathsToWatch) || !pathsToWatch.length) {
			return callback(null);
		}

		for (var i in pathsToWatch) {
			var pathToWatch:string = pathsToWatch[i];

			this._createWatcher(pathToWatch);
		}

		callback(null);
	}

	/**
	 * Creates a watcher for the specified (valid) path
	 *
	 * @param {string} pathToWatch
	 * @returns {boolean}
	 */
	private _createWatcher (pathToWatch:string):boolean {
		var created:boolean = false;

		if (!this._watchers[pathToWatch] && fs.existsSync(pathToWatch)) {
			this._watchers[pathToWatch] = this._folderWatcherFactory.create(pathToWatch);
			this._removeFromInvalidWatcherPaths(pathToWatch);

			created = true;
		}

		return created;
	}

	private _getActiveWatcherPaths ():PathListInterface {
		return Object.keys(this._watchers);
	}

	private _isAbsolutePath (aPath:string):boolean {
		return path.resolve(aPath) === aPath;
	}

	/**
	 * Removes an active folder watcher
	 *
	 * @param {string} pathToWatch
	 * @returns {boolean} `true` if successfully removed
	 */
	private _removeFolderWatcher (pathToWatch:string):boolean {
		var removed:boolean = false;

		if (this._watcherExists(pathToWatch)) {
			this._watchers[pathToWatch].close();

			this._watchers[pathToWatch] = null;
			delete this._watchers[pathToWatch];

			removed = true;
		}

		return removed;
	}

	/**
	 * Adds a path to the {@link core.fs.FolderWatcherManager~_invalidWatcherPaths} list.
	 *
	 * @method core.fs.FolderWatcherManager~_addToInvalidWatcherPaths
	 *
	 * @param {string} pathToWatch
	 */
	private _removeFromInvalidWatcherPaths (pathToWatch:string):void {
		var index:number = this._invalidWatcherPaths.indexOf(pathToWatch);

		if (index !== -1) {
			this._invalidWatcherPaths.splice(index, 1);
		}
	}

	private _watcherExists (pathToWatch:string):boolean {
		return this._watchers[pathToWatch] ? true : false;
	}

}

export = FolderWatcherManager;

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