
import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');
import SearchClientInterface = require('../search/interfaces/SearchClientInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.share.DownloadManager
 * @implements core.share.DownloadManagerInterface
 */
class DownloadManager implements DownloadManagerInterface {

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
	 * A list of running download ids.
	 *
	 * @member {Array} core.share.DownloadManager~_runningDownloadIds
	 */
	private _runningDownloadIds:Array<string> = [];

	constructor (appQuitHandler:AppQuitHandlerInterface, searchClient:SearchClientInterface, indexName:string, options = {}) {
		var defaults:ClosableAsyncOptions = {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

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

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.close((err:Error) => {
			this._isOpen = false;

			this._eventEmitter.removeAllListeners();
			this._eventEmitter = null;

			this._runningDownloadIds = null;
			this._runningDownloadIds = [];

			return internalCallback(null);
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

			if (this._isOpen) {
				this._runningDownloadIds.push(responseId);
				this._eventEmitter.emit('downloadAdded', responseId, response.itemName, response.itemStats.size, response.itemHash, response._meta);
			}

			return internalCallback(null);
		});
	}

	public downloadEnded (downloadId:string, reason:string):void {
		if (this._downloadExists(downloadId)) {
			this._runningDownloadIds.splice(this._runningDownloadIds.indexOf(downloadId), 1);
			this._eventEmitter.emit('downloadEnded', downloadId, reason);
		}
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onDownloadAdded (listener:(downloadId:string, fileName:string, fileSize:number, fileHash:string, metadata:Object) => any):void {
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

			this._isOpen = true;

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

}

export = DownloadManager;