/// <reference path='../../main.d.ts' />

import childProcess = require('child_process');
import fs = require('fs-extra');
import path = require('path');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchStoreInterface = require('./interfaces/SearchStoreInterface');
import SearchStoreOptions = require('./interfaces/SearchStoreOptions');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * @see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/
 * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/setup-configuration.html
 * @see https://github.com/medcl/elasticsearch-partialupdate
 * @see https://github.com/jprante/elasticsearch-transport-websocket
 *
 * todo restart the database server whenever it stops (aka. forever)
 *
 * @class core.search.SearchStore
 * @implements core.search.SearchStoreInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {core.search.SearchStore.Options} options
 */
class SearchStore implements SearchStoreInterface {

	/**
	 * The internally used config object
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchStore~_config
	 */
	private _config:ConfigInterface = null;

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
	 * A flag indicates whether the store is closed or open
	 *
	 * @member {boolean} core.search.SearchStore~_isOpen
	 */
	private _isOpen = false;

	/**
	 * The mix of the passed in options object and the defaults
	 *
	 * @member {core.utils.SearchStoreOptions} core.search.SearchStore~_options
	 */
	private _options:SearchStoreOptions = null;

	public static getDefaults ():SearchStoreOptions {
		return {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};
	}

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, options:SearchStoreOptions = {}) {
		this._config = config;
		this._options = ObjectUtils.extend(SearchStore.getDefaults(), options);

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		process.once('exit', () => {
			if (this._databaseServerProcessId > 0) {
				// todo set signal for windows
				try {
					process.kill(this._databaseServerProcessId);
				}
				catch (err) {}
			}
		});

		this.open(this._options.onOpenCallback);
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		// kill the elasticsearch deamon
		if (this._databaseServerProcessId > 0) {
			// todo set signal for windows
			try {
				process.kill(this._databaseServerProcessId);
			}
			catch (err) {
				// todo log process not found!
				logger.error('SearchStore#close: Database is already down.');
			}
		}

		this._databaseServerProcess.kill();
		this._isOpen = false;

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
			this._isOpen = true;
			internalCallback(err);
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
	 * - __-p__: The path where elasticsearch should save its process id
	 * - __-Des.config__: The path to the config file
	 * - __-Des.path.data__: The path where the indexes should be stored
	 * * - __-Des.logger.level__: The level of the logger
	 *
	 * If we are in node-webkit and the config-file does not exist in Peeriod's specific application data path,
	 * it is dumped there. This is to ensure elasticsearch's whitespace problem in paths, as we have no control over
	 * where users store their applications.
	 *
	 * @method core.search.SearchStore~_getDatabaseServerProcessArgs
	 *
	 * @returns {Array<string>}
	 */
	private _getDatabaseServerProcessArgs ():Array<string> {
		var originalConfigPath:string = path.resolve(__dirname, '../../', this._config.get('search.searchStoreConfig'));
		var storagePath:string = null;
		var configPath:string = null;

		if (process.env.IS_NODE_WEBKIT) {
			var destinationConfigPath:string = path.resolve(this._config.get('app.dataPath'), '../../Peeriod', this._config.get('search.searchStoreConfig'));

			if (!fs.existsSync(destinationConfigPath)) {
				var origContents:string = fs.readFileSync(originalConfigPath, {encoding: 'utf8'});

				fs.outputFileSync(destinationConfigPath, origContents);
			}

			configPath = destinationConfigPath;
			storagePath = path.resolve(this._config.get('app.dataPath'), '../../Peeriod', this._config.get('search.databasePath'));
		}
		else {
			storagePath = path.resolve(__dirname, '../../', this._config.get('search.databasePath'));
			configPath = originalConfigPath;
		}

		return [
			'-p',
			this._getDatabaseServerProcessIdPath(),
			('-Des.config=' + configPath),
			('-Des.path.data=' + storagePath),
			//('-Des.logger.level=DEBUG'),
			'-d'
		];
	}

	/**
	 * Returns the path where to look up the database server process id.
	 *
	 * This is in the database server module path when no node-webkit is used.
	 * Otherwise it's the os-specific appDataPath.
	 *
	 * @method core.search.SearchStore~_getDatabaseServerProcessIdPath
	 *
	 * @returns {string}
	 */
	private _getDatabaseServerProcessIdPath ():string {
		if (!process.env.IS_NODE_WEBKIT) {
			return path.join(this._getDatabaseServerModulePath(), this._config.get('search.pidFilename'));
		}
		else {
			return path.resolve(this._config.get('app.dataPath'), '../../Peeriod', this._config.get('search.pidFilename'));
		}
	}

	/**
	 * Uses a child process to start up the database server, reads the process id from the {@link core.search.SearchStore~_getDatabaseServerProcessIdPath}
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
					logger.error('SearchStore~_startUpDatabaseServer: could not read elasticsearch process id!');
					return callback(err);
				}
				else {
					logger.log('index', 'SearchStore~_startUpDatabaseServer: database is running', { pid: pid });
				}

				this._databaseServerProcessId = pid;

				return callback(null);
			});
		});
	}

}

export = SearchStore;