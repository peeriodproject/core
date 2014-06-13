/// <reference path='../../../ts-definitions/node/node.d.ts' />
var http = require('http');

var path = require('path');

//var sockjs = require('sockjs');
var PrimusIo = require('primus.io');
var nodeStatic = require('node-static');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.ui.UiManager
* @implements core.ui.UiManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.ui.UiComponentListInterface} components
* @param {core.utils.ClosableAsyncOptions} options (optional)
*/
var UiManager = (function () {
    function UiManager(config, appQuitHandler, components, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * A list of components managed by the manager instance
        *
        * @member {core.ui.UiComponentListInterface} core.ui.UiManager~_channelComponentsMap
        */
        this._components = [];
        /**
        * A map of UiComponents per channel
        *
        * todo ts-definition
        *
        * @member {} core.ui.UiManager~_channelComponentsMap
        */
        this._channelComponentsMap = {};
        /**
        * todo ts-definitions
        *
        * @member {Array} core.ui.UiManager~_channels
        */
        this._channelsMap = {};
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
            closeOnProcessExit: true,
            onCloseCallback: function () {
            },
            onOpenCallback: function () {
            }
        };

        this._config = config;
        this._components = components;
        this._options = ObjectUtils.extend(defaults, options);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        //this._createChannelsMap()
        this.open(this._options.onOpenCallback);
    }
    UiManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        //this._socketServer.write('closing');
        // closing websocket connections
        /*if (this._connections.length) {
        for (var i in this._connections) {
        this._connections[i].end(); // null, { reconnect: true }
        }
        
        this._connections = null;
        this._connections = [];
        }*/
        var channelNames = Object.keys(this._channelsMap);

        if (channelNames.length) {
            for (var i = 0, l = channelNames.length; i < l; i++) {
                var channelName = channelNames[i];

                // destroy the channel
                this._channelsMap[channelName].destroy();
            }

            this._channelsMap = null;
            this._channelsMap = {};
        }

        this._httpServer.close(function () {
            _this._isOpen = false;
            _this._httpServer = null;
            _this._socketServer = null;
            _this._staticServer = null;

            internalCallback(null);
        });

        for (var i = 0, l = this._httpSockets.length; i < l; i++) {
            this._httpSockets[i].destroy();
        }
    };

    UiManager.prototype.getSocketServer = function () {
        if (process.env.NODE_ENV === 'test') {
            return this._socketServer;
        } else {
            console.error('Do not use this method outside the test environment!');
            return null;
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

    UiManager.prototype._setupSocketChannelComponentMap = function () {
        if (this._components.length) {
            for (var i = 0, l = this._components.length; i < l; i++) {
                var component = this._components[i];
                var channelName = component.getChannelName();

                if (this._channelsMap[channelName] || this._channelComponentsMap[channelName]) {
                    throw new Error('UiManager._createChannelComnentMap: Another Component already owns the "' + channelName + '" channel.');
                } else {
                    // create channel
                    this._channelsMap[channelName] = this._socketServer.channel(channelName);

                    // register component to channel
                    this._channelComponentsMap[channelName] = component;
                }
            }
        }
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

    UiManager.prototype._handleSocketChannel = function (channelName, spark) {
        var component = this._channelComponentsMap[channelName];

        if (component) {
            // automagically getInitialState listener
            spark.on('getInitialState', function (callback) {
                callback(component.getState());
            });

            component.onConnection(spark);
        }
        //this._connections.push(spark);
    };

    // todo spark ts-definitions
    /*private _handleSocket (spark:any):void {
    var channels:Array<string> = Object.keys(this._channelComponentsMap);
    
    if (channels.length) {
    for (var i in channels) {
    var channel:string = channels[i];
    var channelComponent:UiComponentInterface = this._channelComponentsMap[channel];
    
    spark.on(channel, function (message, callback) {
    channelComponent.onMessage(message, callback);
    });
    }
    /*spark.on('chat', function (name, fn) {
    console.log(name); //-> Bob
    fn('woot');
    
    spark.send('What is your name', function (name) {
    console.log(name); //-> My name is Ann
    });
    });* /
    }
    
    this._connections.push(spark);
    }*/
    /*private _bindComponentsToConnection (spark:any):void {
    if (this._components.length) {
    for (var i in this._components) {
    var component:UiComponentInterface = this._components[i];
    //var channelName:string = component.getChannelName();
    
    //spark.on(channelName)
    }
    }
    }*/
    /**
    * Sets up the websocket server and hooks it into the {@link core.ui.UiManager~_httpServer}
    *
    * @see core.ui.UiManager~_socketServer
    *
    * @method core.ui.UiManager~_setupSocketServer
    */
    UiManager.prototype._setupSocketServer = function () {
        this._socketServer = new PrimusIo(this._httpServer, {
            port: this._config.get('ui.UiManager.socketServer.port'),
            transformer: this._config.get('ui.UiManager.socketServer.transformer'),
            parser: this._config.get('ui.UiManager.socketServer.parser')
        });

        var staticPublicPath = this._config.get('ui.UiManager.staticServer.publicPath');
        var clientLibPath = path.resolve(path.join(staticPublicPath, 'primus.io.js'));

        // todo check if file exists
        this._socketServer.save(clientLibPath);

        this._setupSocketChannelComponentMap();
        this._setupSocketChannels();
    };

    /**
    * Binds the members of the {@link core.ui.UiManager~_channelsMap} to the connection event of the corresponding channel
    *
    * @method core.ui.UiManager~_setupSocketChannels
    */
    UiManager.prototype._setupSocketChannels = function () {
        var _this = this;
        var channelNames = Object.keys(this._channelsMap);

        if (channelNames.length) {
            for (var i = 0, l = channelNames.length; i < l; i++) {
                var channelName = channelNames[i];

                this._channelsMap[channelName].on('connection', function (connection) {
                    _this._handleSocketChannel(channelName, connection);
                });
            }
        }
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
    *
    * @param {Function} callback
    */
    UiManager.prototype._startServers = function (callback) {
        /*this._socketServer.on('connection', (spark) => {
        this._handleSocket(spark);
        });*/
        //console.log(' [*] Listening on 127.0.0.1:9999' );
        this._httpServer.listen(this._config.get('ui.UiManager.staticServer.port'), 'localhost', 511, function () {
            callback();
        });
    };
    return UiManager;
})();

module.exports = UiManager;
//# sourceMappingURL=UiManager.js.map
