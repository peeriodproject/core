/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/express/express.d.ts' />
var http = require('http');

//var sockjs = require('sockjs');
var Primus = require('primus');
var node_static = require('node-static');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.ui.UiManager
* @implements core.ui.UiManagerInterface
*/
var UiManager = (function () {
    function UiManager(config, components, options) {
        var _this = this;
        this._components = [];
        this._connections = [];
        this._config = null;
        this._httpServer = null;
        this._httpSockets = [];
        this._isOpen = false;
        this._options = {};
        this._staticServer = null;
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

    UiManager.prototype._handleHttpRequest = function (request, response) {
        var _this = this;
        request.addListener('end', function () {
            _this._staticServer.serve(request, response, function (err, result) {
                _this._handleStatic(err, request, response, result);
            });
            response.end();
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

    UiManager.prototype._handleStatic = function (err, request, response, result) {
        if (err) {
            console.error("Error serving " + request.url + " - " + err.message);

            // Respond to the client
            response.writeHead(err.status, err.headers);
            response.end();
        }
    };

    UiManager.prototype._setupSocketServer = function () {
        var _this = this;
        this._socketServer = new Primus(this._httpServer, {});
        this._socketServer.on('connection', function (connection) {
            _this._handleSocket(connection);
        });
    };

    UiManager.prototype._setupStaticServer = function () {
        this._staticServer = new node_static.Server(this._config.get('ui.UiManager.publicDirectory'));
    };

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

    UiManager.prototype._startServers = function (callback) {
        var _this = this;
        this._socketServer.on('connection', function (spark) {
            _this._handleSocket(spark);
        });

        //console.log(' [*] Listening on 127.0.0.1:9999' );
        this._httpServer.listen(this._config.get('ui.UiManager.serverPort'), 'localhost', function () {
            callback();
        });
    };
    return UiManager;
})();

module.exports = UiManager;
//# sourceMappingURL=UiManager.js.map
