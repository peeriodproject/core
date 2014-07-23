
import events = require('events');
import fs = require('fs');
import path = require('path');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');
import SearchClientInterface = require('../search/interfaces/SearchClientInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.share.DownloadManager
 * @implements core.share.DownloadManagerInterface
 */
class DownloadManager implements DownloadManagerInterface {

	/**
	 * The internally used config instance
	 *
	 * @member {core.config.ConfigInterface} core.share.DownloadManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The absolute path where new downloads should be stored
	 *
	 * @member {string} core.share.DownloadManager~_downloadDestination
	 */
	private _downloadDestination:string = '';

	/**
	 * The search index where the query responses are stored.
	 *
	 * @member {string} core.share.DownloadManager~_indexName
	 */
	private _indexName:string = '';

	/**
	 * A flag indicates weateher the manager is open or closed.
	 *
	 * @member {boolean} core.share.DownloadManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The internally used event emitter to emit download updates
	 *
	 * @member {string} core.share.DownloadManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * The options object.
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.share.DownloadManager~_options
	 */
	private _options:ClosableAsyncOptions = {};

	/**
	 * The internally used search client to get the response data that are required to start a new download
	 *
	 * @member {core.search.SearchClientInterface} core.share.DownloadManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	/**
	 * The state handler that manages the {@link core.share.DownloadManager~_downloadDestination}
	 *
	 * @member {core.utils.StateHandlerInterface} core.share.DownloadManager~_stateHandler
	 */
	private _stateHandler:StateHandlerInterface = null;

	/**
	 * A list of running download ids.
	 *
	 * @member {Array} core.share.DownloadManager~_runningDownloadIds
	 */
	private _runningDownloadIds:Array<string> = [];

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, stateHandlerFactory:StateHandlerFactoryInterface, searchClient:SearchClientInterface, indexName:string, options = {}) {
		var defaults:ClosableAsyncOptions = {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._stateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('share.downloadManagerStateConfig')));
		this._searchClient = searchClient;
		this._indexName = indexName;
		this._options = ObjectUtils.extend(defaults, options);

		this._eventEmitter = new events.EventEmitter();

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public cancelDownload (downloadId:string):void {
		if (this._downloadExists(downloadId)) {
			this._eventEmitter.emit('downloadCanceled', downloadId);
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;
		var searchClientClosed:boolean = false;
		var downloadsEnded:boolean = false;
		var checkAndReturn:Function = function (err:Error) {
			if (err) {
				console.error(err);
			}

			if (searchClientClosed && downloadsEnded) {
				return internalCallback(err);
			}
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._stateHandler.save({ destination: this._downloadDestination }, (stateErr:Error) => {
			this._isOpen = false;

			this._cancelAllRunningDownloads(() => {
				this._eventEmitter.removeAllListeners();
				this._eventEmitter = null;

				this._runningDownloadIds = null;
				this._runningDownloadIds = [];

				downloadsEnded = true;

				return checkAndReturn(null);
			});

			this._searchClient.close((err:Error) => {
				err = stateErr || err;

				searchClientClosed = true;


				return checkAndReturn(err);
			});
		});
	}

	public createDownload (responseId:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		if (this._downloadExists(responseId)) {
			return process.nextTick(internalCallback.bind(null, new Error('DownloadManager#createDownload: Download is already in progress.')));
		}

		this._searchClient.getIncomingResponseById(this._indexName, '', responseId, (err:Error, response:any) => {
			var itemSize:number;

			if (err) {
				return internalCallback(err);
			}
			else if (!response) {
				return internalCallback(new Error('DownloadManager#createDownload: Could not find a response with the given id.'));
			}

			itemSize = response.itemStats ? response.itemStats.size : 0;

			if (!itemSize) {
				return internalCallback(new Error('DownloadManager#createDownload: Could not create download. No or empty file size provided.'));
			}

			this.getDownloadDestination((err:Error, destination:string) => {
				if (err) {
					return internalCallback(err);
				}

				if (this._isOpen) {
					this._runningDownloadIds.push(responseId);
					this._eventEmitter.emit('downloadAdded', responseId, response.itemName, response.itemStats.size, response.itemHash, destination, response._meta);
				}

				return internalCallback(null);
			});
		});
	}

	public downloadEnded (downloadId:string, reason:string):void {
		if (this._downloadExists(downloadId)) {
			this._runningDownloadIds.splice(this._runningDownloadIds.indexOf(downloadId), 1);
			this._eventEmitter.emit('downloadEnded', downloadId, reason);
		}
	}

	public getDownloadDestination (callback:(err:Error, destinationPath:string) => any):void {
		fs.exists(this._downloadDestination, (exists:boolean) => {
			if (!exists) {
				return callback(new Error('DownloadManager#getDownloadDestination: The download destination does not exists: ' + this._downloadDestination), null);
			}

			return callback(null, this._downloadDestination);
		});
	}

	public getRunningDownloadIds (callback:(downloadIdList:Array<string>) => any):void {
		return process.nextTick(callback.bind(null, this._runningDownloadIds.slice()));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onDownloadAdded (listener:(downloadId:string, fileName:string, fileSize:number, fileHash:string, destination:string, metadata:Object) => any):void {
		this._eventEmitter.addListener('downloadAdded', listener);
	}

	public onDownloadCanceled (listener:(downloadId:string) => any):void {
		this._eventEmitter.addListener('downloadCanceled', listener);
	}

	public onDownloadStatusChanged (listener:(downloadId:string, status:string) => any):void {
		this._eventEmitter.addListener('downloadStatusChanged', listener);
	}

	public onDownloadProgressUpdate (listener:(downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number) => any):void {
		this._eventEmitter.addListener('downloadProgressUpdate', listener);
	}

	public onDownloadEnded (listener:(downloadId:string, reason:string) => any):void {
		this._eventEmitter.addListener('downloadEnded', listener);
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.open((err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			if (!this._eventEmitter) {
				this._eventEmitter = new events.EventEmitter();
			}

			this._stateHandler.load((err:Error, state:Object) => {
				this._isOpen = true;

				if (state && state['destination']) {
					this._downloadDestination = state['destination'];
				}

				return internalCallback(null);
			});
		});
	}

	public setDownloadDestination (destinationPath:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		destinationPath = path.resolve(destinationPath);

		fs.exists(destinationPath, (exists:boolean) => {
			if (!exists) {
				return internalCallback(new Error('DownloadManager#setDownloadDestination: Cannot set the download destination. The path is does not exists: ' + this._downloadDestination));
			}

			this._downloadDestination = destinationPath;

			return internalCallback(null);
		});
	}

	// todo check previous status
	public updateDownloadStatus (downloadId:string, status:string):void {
		if (this._downloadExists(downloadId)) {
			this._eventEmitter.emit('downloadStatusChanged', downloadId, status);
		}
	}

	// todo check previous progress
	public updateDownloadProgress (downloadId:string, writtenBytes:number, fullCountOfExpectedBytes:number):void {
		if (this._downloadExists(downloadId)) {
			this._eventEmitter.emit('downloadProgressUpdate', downloadId, writtenBytes, fullCountOfExpectedBytes);
		}
	}

	/**
	 * Returns `true` if the given download id already exists
	 *
	 * @method core.share.DownloadManager~_downloadExists
	 *
	 * @param {string} downloadId
	 * @returns {boolean}
	 */
	private _downloadExists (downloadId):boolean {
		return this._runningDownloadIds.indexOf(downloadId) !== -1;
	}

	private _cancelAllRunningDownloads (callback:Function):void {
		var idsToWaitFor:Array<string> = [];

		if (!this._runningDownloadIds.length) {
			return callback();
		}

		// register extra listener
		this._eventEmitter.addListener('downloadEnded', (downloadId:string) => {
			var index = idsToWaitFor.indexOf(downloadId)

			if (index !== -1) {
				idsToWaitFor.splice(index, 1);
			}

			if (!idsToWaitFor.length) {
				return callback();
			}
		});

		for (var i = 0, l = this._runningDownloadIds.length; i < l; i++) {
			var id:string = this._runningDownloadIds[i];

			idsToWaitFor.push(id);
			this.cancelDownload(id);
		}
	}

}

export = DownloadManager;