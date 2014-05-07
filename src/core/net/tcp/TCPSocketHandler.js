var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var net = require('net');

/**
* TCPSocketHandler implementation.
*
* @class core.net.tcp.TCPSocketHandler
* @extends events.EventEmitter
* @implements core.net.tcp.TCPSockerHandlerInterface
*
* @param {core.net.tcp.TCPSocketHandlerOptions} opts
*
*/
var TCPSocketHandler = (function (_super) {
    __extends(TCPSocketHandler, _super);
    function TCPSocketHandler(socketFactory, opts) {
        _super.call(this);
        /**
        * Flag which indicates whether a FIN packet should generally be sent when the other end of a handled
        * socket sends a FIN packet.
        *
        * @member {boolean} TCPSocketHandler~_allowHalfOpenSockets
        */
        this._allowHalfOpenSockets = false;
        /**
        * Indicates the number of seconds to wait until a server tries to listen on a used port again.
        * Negative number meas that no retry will be triggered.
        *
        * @member {number} TCPSocketHandler~_connectionRetry
        */
        this._connectionRetry = 0;
        /**
        * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
        * after the last activity until the socket connection is killed from this side.
        *
        * If idle sockets should not be closed, set to 0 or below.
        *
        * @member {number} TCPSocketHandler~_idleConnectionKillTimeout
        */
        this._idleConnectionKillTimeout = 0;
        /**
        * The external IP address of the computer.
        *
        * @member {string} TCPSocketHandler~_myExternalIp
        */
        this._myExternalIp = '';
        /**
        * An array of open ports under which the computer can be reached from outside.
        *
        * @member {number[]} TCPSocketHandler~_myOpenPorts
        */
        this._myOpenPorts = null;
        /**
        * A list of listening, from outside reachable servers. Stored under their port numbers.
        *
        * @member {Object} TCPSocketHandler~_openTCPServer
        */
        this._openTCPServers = {};
        /**
        * Number of ms to wait until an outbound socket without emitting `connected` will be considered as unsuccessful.
        *
        * @member {number} TCPSocketHandler~_outboundConnectionTimeout
        */
        this._outboundConnectionTimeout = 0;
        /**
        * An internal list of ports used to memorize which ports have already been retried.
        *
        * @member {Array<number>} TCPSocketHandler~_retriedPorts
        */
        this._retriedPorts = [];
        /**
        * TCPSocketFactory
        *
        * @member TCPSocketHandler~_socketFactory
        */
        this._socketFactory = null;

        if (!net.isIP(opts.myExternalIp))
            throw new Error('TCPHandler.constructor: Provided IP is no IP');

        this._socketFactory = socketFactory;

        this.setMyExternalIp(opts.myExternalIp);
        this._myOpenPorts = opts.myOpenPorts || [];
        this._idleConnectionKillTimeout = opts.idleConnectionKillTimeout || 0;
        this._allowHalfOpenSockets = !!opts.allowHalfOpenSockets;
        this._connectionRetry = opts.connectionRetry || 3;
        this._outboundConnectionTimeout = opts.outboundConnectionTimeout || 2;
    }
    TCPSocketHandler.prototype.autoBootstrap = function (callback) {
        var _this = this;
        var doCallback = true;
        var callbackTimeout = 0;
        var checkAndCallback = function (port, server) {
            if (callbackTimeout) {
                clearTimeout(callbackTimeout);
            }

            if (Object.keys(_this._openTCPServers).length === _this._myOpenPorts.length) {
                theCallback();
            } else {
                setCallbackTimeout();
            }
        };
        var setCallbackTimeout = function () {
            callbackTimeout = setTimeout(function () {
                theCallback();
            }, 5000);
        };
        var theCallback = function () {
            if (doCallback) {
                callback(_this.getOpenServerPortsArray());
                _this.removeListener('openedReachableServer', checkAndCallback);
            }
            doCallback = false;
        };

        this._myOpenPorts.forEach(function (port) {
            _this.createTCPServerAndBootstrap(port);
        });

        this.on('openedReachableServer', checkAndCallback);

        setCallbackTimeout();
    };

    TCPSocketHandler.prototype.connectTo = function (port, ip, callback) {
        var _this = this;
        var sock = net.createConnection(port, ip);
        var connectionError = function () {
            sock.removeAllListeners();
            sock.destroy();

            if (callback) {
                callback(null);
            } else {
                _this.emit('connection error', port, ip);
            }
        };
        var connectionTimeout = setTimeout(function () {
            connectionError();
        }, this._outboundConnectionTimeout);

        sock.on('error', connectionError);

        sock.on('connect', function () {
            clearTimeout(connectionTimeout);
            sock.removeAllListeners('error');
            var socket = _this._socketFactory.create(sock, _this.getDefaultSocketOptions());

            if (!callback) {
                _this.emit('connected', socket, 'outgoing');
            } else {
                callback(socket);
            }
        });
    };

    TCPSocketHandler.prototype.createTCPServer = function () {
        return net.createServer({
            allowHalfOpen: this._allowHalfOpenSockets
        });
    };

    TCPSocketHandler.prototype.createTCPServerAndBootstrap = function (port) {
        var _this = this;
        var server = this.createTCPServer();

        if (typeof port !== 'number') {
            port = parseInt(port, 10);
        }

        // retry once when encountering EADDRINUSE
        server.on('error', function (error) {
            if (error.code == 'EADDRINUSE') {
                // retry
                if (_this._connectionRetry >= 0 && _this._retriedPorts.indexOf(port) < 0) {
                    _this._retriedPorts.push(port);

                    setTimeout(function () {
                        server.listen(port);
                    }, _this._connectionRetry * 1000);
                }
            }
        });

        // put it in our open server list, if reachable from outside
        server.on('listening', function () {
            var port = server.address().port;

            _this.checkIfServerIsReachableFromOutside(server, function (success) {
                if (success) {
                    _this._openTCPServers[port] = server;

                    server.on('connection', function (sock) {
                        var socket = _this._socketFactory.create(sock, _this.getDefaultSocketOptions());
                        _this.emit('connected', socket, 'incoming');
                    });

                    _this.emit('openedReachableServer', port, server);
                } else {
                    server.close();
                }
            });

            // remove it from our open server list
            server.on('close', function () {
                delete _this._openTCPServers[port];
                _this.emit('closedServer', port);
            });
        });

        server.listen(port);

        return server;
    };

    /**
    * Takes a server and checks if it can be reached from outside the network with the external IP specified in
    * the constructor. Calls a callback with a flag indicating if it was successful (true) or not (false).
    * It does not, however, automatically close the server if it is not reachable.
    *
    * @method TCPSocketHandler#checkIfServerIsReachableFromOutside
    *
    * @param {net.Server} server Server to check
    * @param {Function} callback Callback which gets called with a success flag. `True` if reachable, `false`if unreachable
    */
    TCPSocketHandler.prototype.checkIfServerIsReachableFromOutside = function (server, callback) {
        var connectionTimeout = null;
        var serverOnConnect = function (sock) {
            sock.on('data', function (data) {
                sock.write(data);
            });
        };
        var callbackWith = function (success, socket) {
            callback(success);
            if (socket) {
                socket.end();
            }
            server.removeListener('connection', serverOnConnect);
        };

        server.on('connection', serverOnConnect);

        connectionTimeout = setTimeout(function () {
            callbackWith(false);
        }, 2000);

        this.connectTo(server.address().port, this._myExternalIp, function (socket) {
            socket.writeBuffer(new Buffer([20]));
            socket.on('data', function (data) {
                clearTimeout(connectionTimeout);
                if (data[0] === 20) {
                    callbackWith(true, socket);
                }
            });
        });
    };

    TCPSocketHandler.prototype.getDefaultSocketOptions = function () {
        return {
            idleConnectionKillTimeout: this._idleConnectionKillTimeout,
            doKeepAlive: true
        };
    };

    TCPSocketHandler.prototype.getOpenServerPortsArray = function () {
        return Object.keys(this._openTCPServers).map(function (port) {
            return parseInt(port, 10);
        });
    };

    TCPSocketHandler.prototype.setMyExternalIp = function (ip) {
        this._myExternalIp = ip;
    };
    return TCPSocketHandler;
})(events.EventEmitter);

module.exports = TCPSocketHandler;
//# sourceMappingURL=TCPSocketHandler.js.map
