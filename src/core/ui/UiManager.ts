/// <reference path='../../../ts-definitions/node/node.d.ts' />

import http = require('http');
import net = require('net');
import path = require('path');

//var sockjs = require('sockjs');
var Primus = require('primus');
var nodeStatic = require('node-static');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import UiManagerInterface = require('./interfaces/UiManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.ui.UiManager
 * @implements core.ui.UiManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {todo} components
 * @param {core.utils.ClosableAsyncOptions} options
 */
class UiManager implements UiManagerInterface {

	private _components = [];

	private _connections:Array<net.Socket> = [];

	/**
	 * The internally uses config
	 *
	 * @member {core.config.ConfigInterface} core.ui.UiManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The base http server for serving the UI to the client
	 *
	 * @member {http.Server} core.ui.UiManager~_httpServer
	 */
	private _httpServer:http.Server = null;

	/**
	 * A list of currently open http sockets
	 *
	 * @member {Array<http.Socket>} core.ui.UiManager~_httpSockets
	 */
	private _httpSockets:Array<net.Socket> = [];

	/**
	 * A flag inidcates weather the UiManager is open and the server is running or not.
	 *
	 * @member {boolean} core.ui.UiManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * options
	 *
	 * todo description
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.ui.UiManager~_options
	 */
	private _options:ClosableAsyncOptions = {};

	/**
	 * The static server will serve static files such as templates, css and scripts to the client
	 *
	 * todo type definition
	 *
	 * @member {} core.ui.UiManager~_staticServer
	 */
	private _staticServer = null;

	/**
	 * The socket server is responsible for realtime ui updates
	 *
	 * todo type definition
	 *
	 * @member {} core.ui.UiManager~_socketServer
	 */
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

	/**
	 * Handles a single http request by using the {@link core.ui.UiManager~_staticServer} to process the request.
	 *
	 * @see core.ui.UiManager~_handleStatic
	 *
	 * @method core.ui.UiManager~_handleHttpRequest
	 *
	 * @param {http.request} request
	 * @param response
	 * @private
	 */
	private _handleHttpRequest (request:http.ServerRequest, response:http.ServerResponse):void {
		request.addListener('end', () => {
			this._staticServer.serve(request, response);
		});

		request.resume();
	}

	private _handleSocket (spark:net.Socket):void {
		spark.on('data', function message (data) {
			//console.log(data);
			spark.write(data);
		});

		this._connections.push(spark);
	}

	/**
	 * Sets up the websocket server and hooks it into the {@link core.ui.UiManager~_httpServer}
	 *
	 * @see core.ui.UiManager~_socketServer
	 *
	 * @method core.ui.UiManager~_setupSocketServer
	 */
	private _setupSocketServer ():void {
		this._socketServer = new Primus(this._httpServer, {
			pathname: this._config.get('ui.UiManager.socketServer.pathname'),
			port: this._config.get('ui.UiManager.socketServer.port'),
			transformer: this._config.get('ui.UiManager.socketServer.transformer')
		});

		var staticPublicPath:string = this._config.get('ui.UiManager.staticServer.publicPath');
		var clientLibPath:string = path.resolve(path.join(staticPublicPath, 'primus.js'));

		// todo check if file exists
		this._socketServer.save(clientLibPath);

		this._socketServer.on('connection', (connection) => {
			this._handleSocket(connection);
		});
	}

	/**
	 * Sets up the static server.
	 *
	 * @see core.ui.UiManager~_staticServer
	 *
	 * @method core.ui.UiManager~_setupStaticServer
	 */
	private _setupStaticServer ():void {
		this._staticServer = new nodeStatic.Server(this._config.get('ui.UiManager.staticServer.publicPath'));
	}

	/**
	 * Sets up the base http server
	 *
	 * @method core.ui.UiManager~_setupHttpServer
	 */
	private _setupHttpServer ():void {
		this._httpServer = http.createServer((request, response) => {
			this._handleHttpRequest(request, response);
		});

		this._httpServer.on('connection', (socket:net.Socket) => {
			this._httpSockets.push(socket);
			socket.setTimeout(4000);
			socket.on('close', () => {
				this._httpSockets.splice(this._httpSockets.indexOf(socket), 1);
			});
		});
	}

	/**
	 * Starts the http server (and the ) and calls the callback on listening.
	 *
	 * @method core.ui.UiManager~_startServers
	 */
	private _startServers (callback:Function):void {
		this._socketServer.on('connection', (spark) => {
			this._handleSocket(spark);
		});

		//console.log(' [*] Listening on 127.0.0.1:9999' );
		this._httpServer.listen(this._config.get('ui.UiManager.staticServer.port'), 'localhost', 511, function () {
			callback();
		});
	}
}

export = UiManager;