/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var net = require('net');
var events = require('events');
var tcp_socket = require('./tcp_socket');

var TCPSocket = tcp_socket.TCPSocket;


var TCPSocketHandler = (function (_super) {
    __extends(TCPSocketHandler, _super);
    function TCPSocketHandler(opts) {
        _super.call(this);
        this.my_external_ip = '';
        this.my_open_ports = null;
        this.idle_connection_kill_timeout = 0;
        this.allow_half_open_sockets = false;
        this.connection_retry = 0;
        this.openTCPServers = {};
        this.retriedPorts = [];

        if (!net.isIP(opts.my_external_ip))
            throw new Error('TCPHandler: Provided IP is no IP');

        this.setMyExternalIp(opts.my_external_ip);
        this.my_open_ports = opts.my_open_ports || [];
        this.idle_connection_kill_timeout = opts.idle_connection_kill_timeout || 0;
        this.allow_half_open_sockets = !!opts.allow_half_open_sockets;
        this.connection_retry = opts.connection_retry || 3;
    }
    TCPSocketHandler.prototype.setMyExternalIp = function (ip) {
        this.my_external_ip = ip;
    };

    TCPSocketHandler.prototype.autoBootstrap = function (callback) {
        var _this = this;
        var doCallback = true, callbackTimeout = null, checkAndCallback = function (port, server) {
            if (callbackTimeout)
                clearTimeout(callbackTimeout);

            if (Object.keys(_this.openTCPServers).length === _this.my_open_ports.length) {
                theCallback();
            } else {
                setCallbackTimeout();
            }
        }, setCallbackTimeout = function () {
            callbackTimeout = setTimeout(function () {
                theCallback();
            }, 5000);
        }, theCallback = function () {
            if (doCallback) {
                callback(_this.getOpenServerPortsArray());
                _this.removeListener('opened server', checkAndCallback);
            }
            doCallback = false;
        };

        this.my_open_ports.forEach(function (port) {
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
            var socket = new TCPSocket(sock, _this.defaultSocketOptions());

            if (!callback) {
                _this.emit('connected', socket);
            } else {
                callback(socket);
            }
        });
    };

    TCPSocketHandler.prototype.createTCPServer = function () {
        return net.createServer({
            allowHalfOpen: this.allow_half_open_sockets
        });
    };

    TCPSocketHandler.prototype.createTCPServerAndBootstrap = function (port) {
        var _this = this;
        if (typeof port !== 'number')
            port = parseInt(port, 10);

        var server = this.createTCPServer();

        // retry once when encountering EADDRINUSE
        server.on('error', function (error) {
            if (error.code == 'EADDRINUSE') {
                // retry
                if (_this.connection_retry >= 0 && _this.retriedPorts.indexOf(port) < 0) {
                    _this.retriedPorts.push(port);
                    setTimeout(function () {
                        server.listen(port);
                    }, _this.connection_retry * 1000);
                }
            }
        });

        // put it in our open server list, if reachable from outside
        server.on('listening', function () {
            _this.checkIfServerIsReachableFromOutside(server, function (success) {
                if (success) {
                    var port = server.address().port;
                    _this.openTCPServers[port] = server;

                    server.on('connection', function (sock) {
                        var socket = new TCPSocket(sock, _this.defaultSocketOptions());
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
            delete _this.openTCPServers[server.address().port];
            _this.emit('closed server', port);
        });

        server.listen(port);

        return server;
    };

    TCPSocketHandler.prototype.checkIfServerIsReachableFromOutside = function (server, callback) {
        var connectionTimeout = null, serverOnConnect = function (sock) {
            sock.on('data', function (data) {
                sock.write(data);
            });
        }, callbackWith = function (success, socket) {
            callback(success);
            if (socket)
                socket.end();
            server.removeListener('connection', serverOnConnect);
        };

        server.on('connection', serverOnConnect);

        connectionTimeout = setTimeout(function () {
            callbackWith(false);
            server.close();
        }, 2000);

        this.connectTo(server.address().port, this.my_external_ip, function (socket) {
            socket.writeBuffer(new Buffer([20]));
            socket.on('data', function (data) {
                clearTimeout(connectionTimeout);
                if (data[0] === 20) {
                    callbackWith(true);
                }
            });
        });
    };

    TCPSocketHandler.prototype.defaultSocketOptions = function () {
        return {
            idle_connection_kill_timeout: this.idle_connection_kill_timeout,
            do_keep_alive: true
        };
    };

    TCPSocketHandler.prototype.getOpenServerPortsArray = function () {
        return Object.keys(this.openTCPServers).map(function (port) {
            return parseInt(port, 10);
        });
    };
    return TCPSocketHandler;
})(events.EventEmitter);
exports.TCPSocketHandler = TCPSocketHandler;
//# sourceMappingURL=tcp_socket_handler.js.map
