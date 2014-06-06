/// <reference path='../../../ts-definitions/node/node.d.ts' />
var http = require('http');

var path = require('path');

//var sockjs = require('sockjs');
var Primus = require('primus');
var nodeStatic = require('node-static');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.ui.UiManager
* @implements core.ui.UiManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {todo} components
* @param {core.utils.ClosableAsyncOptions} options
*/
var UiManager = (function () {
    function UiManager(config, components, options) {
        var _this = this;
        this._components = [];
        this._connections = [];
        /**
        * The internally uses config
        *
        * @member {core.config.ConfigInterface} core.ui.UiManager~_config
        */
        this._config = null;
        /**
        * The base http server for serving the UI to the client
        *
        * @member {http.Server} core.ui.UiManager~_httpServer
        */
        this._httpServer = null;
        /**
        * A list of currently open http sockets
        *
        * @member {Array<http.Socket>} core.ui.UiManager~_httpSockets
        */
        this._httpSockets = [];
        /**
        * A flag inidcates weather the UiManager is open and the server is running or not.
        *
        * @member {boolean} core.ui.UiManager~_isOpen
        */
        this._isOpen = false;
        /**
        * options
        *
        * todo description
        *
        * @member {core.utils.ClosableAsyncOptions} core.ui.UiManager~_options
        */
        this._options = {};
        /**
        * The static server will serve static files such as templates, css and scripts to the client
        *
        * todo type definition
        *
        * @member {} core.ui.UiManager~_staticServer
        */
        this._staticServer = null;
        /**
        * The socket server is responsible for realtime ui updates
        *
        * todo type definition
        *
        * @member {} core.ui.UiManager~_socketServer
        */
        this._socketServer = null;
        var defaults = {
            closeOnProcessExit: false,
            onCloseCallback: function () {
            },
            onOpenCallback: function () {
            }
        };

        this._config = config;
        this._components = components;
        this._options = ObjectUtils.extend(defaults, options);

        if (this._options.closeOnProcessExit) {
            process.on('exit', function () {
                _this.close(_this._options.onCloseCallback);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    UiManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
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

        this._httpServer.close(function () {
            _this._isOpen = false;
            _this._httpServer = null;
            _this._socketServer = null;
            _this._staticServer = null;

            internalCallback(null);
        });

        for (var i in this._httpSockets) {
            this._httpSockets[i].destroy();
        }
    };

    /**
    * Returns true if the object is open and therefore writeable.
    *
    * @method core.utils.ClosableAsyncInterface#isOpen
    *
    * @param {Function} callback
    */
    UiManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    /**
    * (Re)-opens a closed Object and restores the previous state.
    *
    * @method core.utils.ClosableAsyncInterface#open
    *
    * @param {Function} callback
    */
    UiManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._setupStaticServer();
        this._setupHttpServer();
        this._setupSocketServer();

        this._startServers(function (err) {
            err = err || null;

            _this._isOpen = true;
            return internalCallback(err);
        });
    };

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
    UiManager.prototype._handleHttpRequest = function (request, response) {
        var _this = this;
        request.addListener('end', function () {
            _this._staticServer.serve(request, response);
        });

        request.resume();
    };

    UiManager.prototype._handleSocket = function (spark) {
        spark.on('data', function message(data) {
            //console.log(data);
            spark.write(data);
        });

        this._connections.push(spark);
    };

    /**
    * Sets up the websocket server and hooks it into the {@link core.ui.UiManager~_httpServer}
    *
    * @see core.ui.UiManager~_socketServer
    *
    * @method core.ui.UiManager~_setupSocketServer
    */
    UiManager.prototype._setupSocketServer = function () {
        var _this = this;
        this._socketServer = new Primus(this._httpServer, {
            pathname: this._config.get('ui.UiManager.socketServer.pathname'),
            port: this._config.get('ui.UiManager.socketServer.port'),
            transformer: this._config.get('ui.UiManager.socketServer.transformer')
        });

        var staticPublicPath = this._config.get('ui.UiManager.staticServer.publicPath');
        var clientLibPath = path.resolve(path.join(staticPublicPath, 'primus.js'));

        // todo check if file exists
        this._socketServer.save(clientLibPath);

        this._socketServer.on('connection', function (connection) {
            _this._handleSocket(connection);
        });
    };

    /**
    * Sets up the static server.
    *
    * @see core.ui.UiManager~_staticServer
    *
    * @method core.ui.UiManager~_setupStaticServer
    */
    UiManager.prototype._setupStaticServer = function () {
        this._staticServer = new nodeStatic.Server(this._config.get('ui.UiManager.staticServer.publicPath'));
    };

    /**
    * Sets up the base http server
    *
    * @method core.ui.UiManager~_setupHttpServer
    */
    UiManager.prototype._setupHttpServer = function () {
        var _this = this;
        this._httpServer = http.createServer(function (request, response) {
            _this._handleHttpRequest(request, response);
        });

        this._httpServer.on('connection', function (socket) {
            _this._httpSockets.push(socket);
            socket.setTimeout(4000);
            socket.on('close', function () {
                _this._httpSockets.splice(_this._httpSockets.indexOf(socket), 1);
            });
        });
    };

    /**
    * Starts the http server (and the ) and calls the callback on listening.
    *
    * @method core.ui.UiManager~_startServers
    */
    UiManager.prototype._startServers = function (callback) {
        var _this = this;
        this._socketServer.on('connection', function (spark) {
            _this._handleSocket(spark);
        });

        //console.log(' [*] Listening on 127.0.0.1:9999' );
        this._httpServer.listen(this._config.get('ui.UiManager.staticServer.port'), 'localhost', 511, function () {
            callback();
        });
    };
    return UiManager;
})();

module.exports = UiManager;
//# sourceMappingURL=UiManager.js.map
