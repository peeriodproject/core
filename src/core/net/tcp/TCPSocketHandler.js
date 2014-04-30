var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var net = require('net');
var events = require('events');

var TCPSocket = require('./TCPSocket');

/**
* TCPSocketHandler implementation.
*
* @class core.net.tcp.TCPSocketHandler
* @extends events.EventEmitter
* @implements TCPSockerHandlerInterface
*
* @param {core.net.tcp.TCPSocketHandlerOptions} opts
*
*/
var TCPSocketHandler = (function (_super) {
    __extends(TCPSocketHandler, _super);
    function TCPSocketHandler(opts) {
        _super.call(this);
        /**
        * Flag which indicates whether a FIN packet should generally be sent when the other end of a handled
        * socket sends a FIN packet.
        *
        * @private
        * @member {boolean} TCPSocketHandler~_allowHalfOpenSockets
        */
        this._allowHalfOpenSockets = false;
        /**
        * Indicates the number of seconds to wait until a server tries to listen on a used port again.
        * Negative number meas that no retry will be triggered.
        *
        * @private
        * @member {number} TCPSocketHandler~_connectionRetry
        */
        this._connectionRetry = 0;
        /**
        * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
        * after the last activity until the socket connection is killed from this side.
        *
        * If idle sockets should not be closed, set to 0 or below.
        *
        * @private
        * @member {number} TCPSocketHandler~_idleConnectionKillTimeout
        */
        this._idleConnectionKillTimeout = 0;
        /**
        * The external IP address of the computer.
        *
        * @private
        * @member {string} TCPSocketHandler~_myExternalIp
        */
        this._myExternalIp = '';
        /**
        * An array of open ports under which the computer can be reached from outside.
        *
        * @private
        * @member {number[]} TCPSocketHandler~_myOpenPorts
        */
        this._myOpenPorts = null;
        /**
        * A list of listening, from outside reachable servers. Stored under their port numbers.
        *
        * @private
        * @member {Object} TCPSocketHandler~_openTCPServer
        */
        this._openTCPServers = {};
        /**
        * An internal list of ports used to memorize which ports have already been retried.
        *
        * @private
        * @member {Array<number>} TCPSocketHandler~_retriedPorts
        */
        this._retriedPorts = [];

        if (!net.isIP(opts.myExternalIp))
            throw new Error('TCPHandler: Provided IP is no IP');

        this.setMyExternalIp(opts.myExternalIp);
        this._myOpenPorts = opts.myOpenPorts || [];
        this._idleConnectionKillTimeout = opts.idleConnectionKillTimeout || 0;
        this._allowHalfOpenSockets = !!opts.allowHalfOpenSockets;
        this._connectionRetry = opts.connectionRetry || 3;
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
                _this.removeListener('opened server', checkAndCallback);
            }
            doCallback = false;
        };

        this._myOpenPorts.forEach(function (port) {
            _this.createTCPServerAndBootstrap(port);
        });

        this.on('opened server', checkAndCallback);

        setCallbackTimeout();
    };

    TCPSocketHandler.prototype.connectTo = function (port, ip, callback) {
        var _this = this;
        var sock = net.createConnection(port, ip);

        sock.on('error', function () {
            this.emit('connection error', port, ip);
        });

        sock.on('connect', function () {
            sock.removeAllListeners('error');

            var socket = new TCPSocket(sock, _this.getDefaultSocketOptions());

            if (!callback) {
                _this.emit('connected', socket);
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
            _this.checkIfServerIsReachableFromOutside(server, function (success) {
                if (success) {
                    var port = server.address().port;
                    _this._openTCPServers[port] = server;

                    server.on('connection', function (sock) {
                        var socket = new TCPSocket(sock, _this.getDefaultSocketOptions());
                        _this.emit('connected', socket);
                    });

                    _this.emit('opened server', port, server);
                } else {
                    server.close();
                }
            });
        });

        // remove it from our open server list
        server.on('close', function () {
            delete _this._openTCPServers[server.address().port];
            _this.emit('closed server', port);
        });

        server.listen(port);

        return server;
    };

    /**
    * Takes a server and checks if it can be reached from outside the network with the external IP specified in
    * the constructor. Calls a callback with a flag indicating if it was successful (true) or not (false).
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
            server.close();
        }, 2000);

        this.connectTo(server.address().port, this._myExternalIp, function (socket) {
            socket.writeBuffer(new Buffer([20]));
            socket.on('data', function (data) {
                clearTimeout(connectionTimeout);
                if (data[0] === 20) {
                    callbackWith(true);
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

    /**
    * Returns an array of open TCP server ports which are reachable from outside.
    *
    * @method TCPSocketHandler#getOpenServerPortsArray
    *
    * @returns {number[]} Array of open server ports
    */
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