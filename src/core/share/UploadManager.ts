import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('../search/interfaces/SearchClientInterface');
import SearchItemInterface = require('../search/interfaces/SearchItemInterface');
import UploadManagerInterface = require('./interfaces/UploadManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.share.UploadManager
 * @implements core.share.UploadManagerInterface
 * 
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {core.search.SearchClientInterface} searchClient
 * @param {string} indexName
 * @param {core.utils.ClosableAsyncOptions} options
 */
class UploadManager implements UploadManagerInterface {

	/**
	 * The search index where the query responses are stored.
	 *
	 * @member {string} core.share.UploadManager~_indexName
	 */
	private _indexName:string = '';

	/**
	 * A flag indicates weateher the manager is open or closed.
	 *
	 * @member {boolean} core.share.UploadManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The internally used event emitter to emit upload updates
	 *
	 * @member {string} core.share.UploadManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * The options object.
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.share.UploadManager~_options
	 */
	private _options:ClosableAsyncOptions = {};

	/**
	 * The internally used search client to get the response data that are required to start a new upload
	 *
	 * @member {core.search.SearchClientInterface} core.share.UploadManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	/**
	 * A list of running upload ids.
	 *
	 * @member {Array} core.share.UploadManager~_runningUploadIds
	 */
	private _runningUploadIds:Array<string> = [];

	constructor (appQuitHandler:AppQuitHandlerInterface, searchClient:SearchClientInterface, indexName:string, options:ClosableAsyncOptions = {}) {
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

	public cancelUpload (uploadId:string):void {
		if (this._uploadExists(uploadId)) {
			this._eventEmitter.emit('uploadCanceled', uploadId);
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;
		var searchClientClosed:boolean = false;
		var uploadsEnded:boolean = false;
		var checkAndReturn:Function = function (err:Error) {
			if (err) {
				console.error(err);
			}

			if (searchClientClosed && uploadsEnded) {
				return internalCallback(err);
			}
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}
		
		this._isOpen = false;

		this._cancelAllRunningUploads(() => {
			this._eventEmitter.removeAllListeners();
			this._eventEmitter = null;

			this._runningUploadIds = null;
			this._runningUploadIds = [];

			uploadsEnded = true;

			return checkAndReturn(null);
		});

		this._searchClient.close((err:Error) => {
			searchClientClosed = true;

			return checkAndReturn(err);
		});
	}

	public createUpload (uploadId:string, filePath:string, fileName:string, fileSize:number):void {
		if (this._runningUploadIds.indexOf(uploadId) !== -1) {
			return;
		}

		this._runningUploadIds.push(uploadId);

		this._eventEmitter.emit('uploadAdded', uploadId, filePath, fileName, fileSize);
	}
	
	public getFileInfoByHash (fileHash:string, callback:(err:Error, fullFilePath:string, filename:string, filesize:number) => any):void {
		this._searchClient.getItemByHash(fileHash, (err:Error, item:SearchItemInterface) => {
			if (err) {
				return callback(err, null, null, null);
			}

			return callback(null, item.getPath(), item.getName(), item.getStats().size);
		});
	}

	public getRunningUploadIds (callback:(uploadIdList:Array<string>) => any):void {
		return process.nextTick(callback.bind(null, this._runningUploadIds.slice()));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onUploadAdded (listener:(uploadId:string, filePath:string, fileName:string, fileSize:number) => any):void {
		this._eventEmitter.addListener('downloadAdded', listener);
	}


	public onUploadCanceled (listener:(uploadId:string) => any):void {
		this._eventEmitter.addListener('uploadCanceled', listener);
	}

	public onUploadStatusChanged (listener:(uploadId:string) => any):void {
		this._eventEmitter.addListener('uploadStatusChanged', listener);
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

			return internalCallback(null);
		});
	}

	public updateUploadStatus (uploadId:string, status:string):void {
		if (this._uploadExists(uploadId)) {
			this._eventEmitter.emit('uploadStatusChanged', uploadId, status);
		}
	}

	public uploadEnded (uploadId:string, reason:string):void {
		if (this._uploadExists(uploadId)) {
			this._runningUploadIds.splice(this._runningUploadIds.indexOf(uploadId), 1);
			this._eventEmitter.emit('uploadEnded', uploadId, reason);
		}
	}

	private _cancelAllRunningUploads (callback:Function):void {
		var idsToWaitFor:Array<string> = [];

		if (!this._runningUploadIds.length) {
			return callback();
		}

		// register extra listener
		this._eventEmitter.addListener('uploadEnded', (uploadId:string) => {
			var index = idsToWaitFor.indexOf(uploadId)

			if (index !== -1) {
				idsToWaitFor.splice(index, 1);
			}

			if (!idsToWaitFor.length) {
				return callback();
			}
		});

		for (var i = 0, l = this._runningUploadIds.length; i < l; i++) {
			var id:string = this._runningUploadIds[i];

			idsToWaitFor.push(id);
			this.cancelUpload(id);
		}
	}

	/**
	 * Returns `true` if the given upload id already exists
	 *
	 * @method core.share.UploadManager~_uploadExists
	 *
	 * @param {string} uploadId
	 * @returns {boolean}
	 */
	private _uploadExists (uploadId):boolean {
		return this._runningUploadIds.indexOf(uploadId) !== -1;
	}
	
}

export = UploadManager;