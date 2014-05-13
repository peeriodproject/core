/// <reference path='../../../ts-definitions/node/node.d.ts' />

var elasticsearch = require('elasticsearch');
import childProcess = require('child_process');
import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchStoreInterface = require('./interfaces/SearchStoreInterface');
import SearchStoreOptions = require('./interfaces/SearchStoreOptions');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/
 *
 * @class core.search.SearchStore
 * @implements core.search.SearchStoreInterface
 */
class SearchStore implements SearchStoreInterface {

	private _client = null;
	private _config = null;

	/**
	 * The mix of the passed in options object and the defaults
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchStore~_options
	 */
	private _options:SearchStoreOptions = null;

	private _serverProcess:childProcess.ChildProcess = null;

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

		process.on('exit', () => {
			this.close(this._options.onCloseCallback);
		});

		this.open(this._options.onOpenCallback);
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		this._serverProcess.kill();
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {

	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		this._startUpServer();

		this._client = elasticsearch.Client({
			host: this._config.get('search.host') + ':' + this._config.get('search.port'),
			log : {
				type : 'file',
				level: 'trace',
				path : path.join(this._options.logsPath, this._options.logsFileName)
			}
		});

		this._waitForServer(internalCallback);
	}

	private _waitForServer (callback):void {
		var check = (i:number) => {
			this._client.ping({
				requestTimeout: 1000,
				hello         : 'elasticsearch'
			}, (err:Error) => {
				if (err) {
					if (i < 30) {
						setTimeout(() => {
							//console.error('elasticsearch cluster is down!');
							check(++i);
						}, 500);
					}
					else {
						callback(new Error('SearchStore~waitForServer: Server is after 15000ms still not reachable'));
					}
				}
				else {
					console.log('All is well');
					callback(null);
				}
			});
		};

		check(0);
	}

	private _startUpServer ():void {
		// todo add windows switch to elasticsearch.bat here
		var osPath = 'bin/elasticsearch';
		var searchPath = path.join(__dirname, '../../bin/', this._config.get('search.binaryPath'));
		var binaryPath = path.join(searchPath, osPath);

		this._serverProcess = childProcess.execFile(binaryPath, ['-p', path.join(searchPath, '../elasticsearch-pid')], {}, function (err, stdout, stderr) {
		});

		//console.log(this._serverProcess);
	}

}

export = SearchStore;