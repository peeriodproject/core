
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

	private _indexName:string = '';

	private _isOpen:boolean = false;

	private _eventEmitter:events.EventEmitter = null;

	private _options:ClosableAsyncOptions = {};

	private _searchClient:SearchClientInterface = null;

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

	private _downloadExists (downloadId):boolean {
		return this._runningDownloadIds.indexOf(downloadId) !== -1;
	}

}

export = DownloadManager;