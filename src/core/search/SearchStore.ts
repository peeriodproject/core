/// <reference path='../../../ts-definitions/node/node.d.ts' />

var elasticsearch = require('elasticsearch');

import childProcess = require('child_process');
import fs = require('fs');
import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchStoreInterface = require('./interfaces/SearchStoreInterface');
import SearchStoreOptions = require('./interfaces/SearchStoreOptions');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/
 *
 * todo restart the database server whenever it stops (aka. forever)
 *
 * @class core.search.SearchStore
 * @implements core.search.SearchStoreInterface
 */
class SearchStore implements SearchStoreInterface {

	/**
	 * The client which is used internally to make requests against the database api
	 *
	 * @member {elasticsearch.Client} core.search.SearchStore~_client
	 */
	private _client = null;

	/**
	 * The internally used config object
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchStore~_config
	 */
	private _config = null;

	/**
	 * The child process that starts the database server
	 *
	 * @member {ChildProcess} core.search.SearchStore~_serverProcess
	 */
	private _databaseServerProcess:childProcess.ChildProcess = null;

	/**
	 * The process id of the database server
	 *
	 * @member {number} core.search.SearchStore~_serverProcessId
	 */
	private _databaseServerProcessId:number = -1;

	/**
	 * A flag indicates weather the store is closed or open
	 *
	 * @member {boolean} core.search.SearchStore~_isOpen
	 */
	private _isOpen = false;

	/**
	 * The mix of the passed in options object and the defaults
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchStore~_options
	 */
	private _options:SearchStoreOptions = null;

	constructor (config:ConfigInterface, options:SearchStoreOptions = {}) {
		var defaults:SearchStoreOptions = {
			closeOnProcessExit: true,
			logsPath          : '../../logs',
			logsFileName      : 'searchStore.log',
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._options = ObjectUtils.extend(defaults, options);
		this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		// kill the elasticsearch deamon
		if (this._databaseServerProcessId !== -1) {
			// todo set signal for windows
			try {
				process.kill(this._databaseServerProcessId);
			}
			catch (err) {
				// todo log process not found!
				console.error('process was killed before...');
			}
		}

		this._databaseServerProcess.kill();
		this._isOpen = false;
		this._client = null;

		return process.nextTick(internalCallback.bind(null, null));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._startUpDatabaseServer((err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			this._client = elasticsearch.Client({
				host: this._config.get('search.host') + ':' + this._config.get('search.port'),
				log : {
					type : 'file',
					level: 'trace',
					path : path.join(this._options.logsPath, this._options.logsFileName)
				}
			});

			this._waitForDatabaseServer((err:Error) => {
				if (err) {
					console.log(err);
					internalCallback(err);
				}
				else {
					this._isOpen = true;
					internalCallback(null);
				}
			});
		});
	}

	/**
	 * Returns the path to the database server module
	 *
	 * @method core.search.SearchStore~_getDatabaseServerModulePath
	 *
	 * @returns {string}
	 */
	private _getDatabaseServerModulePath ():string {
		return path.join(__dirname, '../../bin/', this._config.get('search.binaryPath'));
	}

	/**
	 * Returns the path to the database server binary.
	 *
	 * todo add windows switch to elasticsearch.bat!
	 *
	 * @method core.search.SearchStore~_getDatabaseServerBinaryPath
	 *
	 * @returns {string}
	 */
	private _getDatabaseServerBinaryPath ():string {
		var osPath:string = 'bin/elasticsearch';

		return path.join(this._getDatabaseServerModulePath(), osPath);
	}

	/**
	 * Returns the arguments the database server should start with. The following options are currently included:
	 *
	 * - -p:
	 * - -Des.config:
	 * - -Des.path.data:
	 *
	 * @method core.search.SearchStore~_getDatabaseServerProcessArgs
	 *
	 * @returns {string[]}
	 */
	private _getDatabaseServerProcessArgs ():Array<string> {
		var configPath:string = path.resolve(__dirname, '../../', this._config.get('search.searchStoreConfig'));
		var storagePath:string = path.resolve(__dirname, '../../', this._config.get('search.databasePath'));

		return [
			'-p',
			this._getDatabaseServerProcessIdPath(),
			('-Des.config=' + configPath),
			('-Des.path.data=' + storagePath),
			'-d'
		];
	}

	/**
	 * Returns the path where to look up the database server process id.
	 *
	 * @method core.search.SearchStore~_getDatabaseServerProcessIdPath
	 *
	 * @returns {string}
	 */
	private _getDatabaseServerProcessIdPath ():string {
		return path.join(this._getDatabaseServerModulePath(), '../elasticsearch-pid');
	}

	/**
	 * Pings the database server in a specified interval and calls the callback after a specified timeout.
	 *
	 * @method core.search.SearchStore~_waitForDatabaseServer
	 */
	private _waitForDatabaseServer (callback):void {
		var check = (i:number) => {
			this._client.ping({
				requestTimeout: 1000,
				hello         : 'elasticsearch'
			}, (err:Error) => {
				if (err) {
					if (i < 30) {
						setTimeout(() => {
							check(++i);
						}, 500);
					}
					else {
						callback(new Error('SearchStore~waitForServer: Server is not reachable after 15 seconds'));
					}
				}
				else {
					callback(null);
				}
			});
		};

		check(0);
	}

	/**
	 * Uses a child process to start up the database server and reads it process id from the {@link core.search.SearchStore~_getDatabaseServerProcessIdPath}
	 * and stores it in {@link core.search.SearchStore~_databaseServerProcessId} before calling the callback function.
	 *
	 * @method core.search.SearchStore~_startUpDatabaseServer
	 *
	 * @param {Function} callback
	 */
	private _startUpDatabaseServer (callback:(err:Error) => void):void {
		this._databaseServerProcess = childProcess.execFile(this._getDatabaseServerBinaryPath(), this._getDatabaseServerProcessArgs(), {}, (err, stdout, stderr) => {

			fs.readFile(this._getDatabaseServerProcessIdPath(), {
				encoding: 'ascii'
			}, (err:Error, data:string) => {
				var pid:number = parseInt(data, 10);

				if (err || isNaN(pid)) {
					callback(err);
				}
				else {
					this._databaseServerProcessId = pid;
					callback(null);
				}
			});
		});
	}

}

export = SearchStore;