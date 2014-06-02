/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/express/express.d.ts' />

import http = require('http');
//var sockjs = require('sockjs');
var Primus = require('primus');
var node_static = require('node-static');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import UiManagerInterface = require('./interfaces/UiManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.ui.UiManager
 * @implements core.ui.UiManagerInterface
 */
class UiManager implements UiManagerInterface {

	private _components = [];

	private _connections = [];

	private _config:ConfigInterface = null;

	private _httpServer = null;
	private _httpSockets = [];

	private _isOpen:boolean = false;

	private _options:ClosableAsyncOptions = {};

	private _staticServer = null;
	private _socketServer = null;

	constructor (config:ConfigInterface, components, options:ClosableAsyncOptions) {
		var defaults:ClosableAsyncOptions = {
			closeOnProcessExit: false,
			onCloseCallback   : function () {
			},
			onOpenCallback    : function () {
			}
		};

		this._config = config;
		this._components = components;
		this._options = ObjectUtils.extend(defaults, options);

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		// closing websocket connections
		if (this._connections.length) {
			for (var i in this._connections) {
				this._connections[i].end(); // null, { reconnect: true }
			}

			this._connections = null;
			this._connections = [];
		}

		this._httpServer.close(() => {
			this._isOpen = false;
			this._httpServer = null;
			this._socketServer = null;
			this._staticServer = null;

			internalCallback(null);
		});

		for (var i in this._httpSockets) {
			this._httpSockets[i].destroy();
		}
	}

	/**
	 * Returns true if the object is open and therefore writeable.
	 *
	 * @method core.utils.ClosableAsyncInterface#isOpen
	 *
	 * @param {Function} callback
	 */
	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	/**
	 * (Re)-opens a closed Object and restores the previous state.
	 *
	 * @method core.utils.ClosableAsyncInterface#open
	 *
	 * @param {Function} callback
	 */
	public open (callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._setupStaticServer();
		this._setupHttpServer();
		this._setupSocketServer();

		this._startServers((err) => {
			err = err || null;

			this._isOpen = true;
			return internalCallback(err);
		});
	}

	private _handleHttpRequest (request, response):void {
		request.addListener('end', () => {
			this._staticServer.serve(request, response, (err, result) => {
				this._handleStatic(err, request, response, result);
			});
			response.end();
		});

		request.resume();
	}

	private _handleSocket (spark):void {
		spark.on('data', function message (data) {
			//console.log(data);
			spark.write(data);
		});

		this._connections.push(spark);
	}

	private _handleStatic (err, request, response, result):void {
		if (err) { // There was an error serving the file
			console.error("Error serving " + request.url + " - " + err.message);

			// Respond to the client
			response.writeHead(err.status, err.headers);
			response.end();
		}

	}

	private _setupSocketServer ():void {
		this._socketServer = new Primus(this._httpServer, {});
		this._socketServer.on('connection', (connection) => {
			this._handleSocket(connection);
		});
	}

	private _setupStaticServer ():void {
		this._staticServer = new node_static.Server(this._config.get('ui.UiManager.publicDirectory'));
	}

	private _setupHttpServer ():void {
		this._httpServer = http.createServer((request, response) => {
			this._handleHttpRequest(request, response);
		});

		this._httpServer.on('connection', (socket) => {
			this._httpSockets.push(socket);
			socket.setTimeout(4000);
			socket.on('close', () => {
				this._httpSockets.splice(this._httpSockets.indexOf(socket), 1);
			});
		});
	}

	private _startServers (callback:Function):void {
		this._socketServer.on('connection', (spark) => {
			this._handleSocket(spark);
		});

		//console.log(' [*] Listening on 127.0.0.1:9999' );
		this._httpServer.listen(this._config.get('ui.UiManager.serverPort'), 'localhost', function () {
			callback();
		});
	}
}

export = UiManager;