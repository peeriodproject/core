/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var TCPSocket = (function (_super) {
    __extends(TCPSocket, _super);
    function TCPSocket(socket, opts) {
        _super.call(this);
        this.socket = null;
        this.closeOnTimeout = false;
        this.eventsToPropagate = ['data', 'close', 'error'];
        this.identifier = '';

        this.setSocket(socket);

        // set keep-alive
        if (opts.do_keep_alive) {
            this.getSocket().setKeepAlive(true, opts.keep_alive_delay || 0);
        }

        // set the timeout
        if (opts.idle_connection_kill_timeout > 0) {
            this.closeOnTimeout = true;
            this.getSocket().setTimeout(opts.idle_connection_kill_timeout * 1000);
        }

        this.setupListeners();
    }
    /**
    * Takes an array of event names and propagates the corresponding node.js's net.Socket events,
    * so that the raw socket doesn't have to be accessed.
    *
    * @param events
    */
    TCPSocket.prototype.propagateEvents = function (events) {
        var _this = this;
        events.forEach(function (event) {
            (function (evt) {
                _this.getSocket().on(evt, function () {
                    return _this.emit.apply(_this, [evt].concat(Array.prototype.splice.call(arguments, 0)));
                });
            })(event);
        });
    };

    TCPSocket.prototype.setupListeners = function () {
        var _this = this;
        var socket = this.getSocket();
        socket.on('timeout', function () {
            return _this.onTimeout();
        });

        socket.on('error', function (error) {
            console.log(error);
        });

        this.propagateEvents(this.eventsToPropagate);
    };

    TCPSocket.prototype.setSocket = function (socket) {
        this.socket = socket;
    };

    TCPSocket.prototype.getSocket = function () {
        if (!this.socket)
            throw new Error('TCPSocket: getSocket() called, but no socket set on this connection!');

        return this.socket;
    };

    TCPSocket.prototype.end = function (data, encoding) {
        this.getSocket().end(data, encoding);
    };

    TCPSocket.prototype.getIPPortString = function () {
        var socket = this.getSocket();
        return socket.remoteAddress + ':' + socket.remotePort;
    };

    TCPSocket.prototype.writeBuffer = function (buffer, callback) {
        var success = this.getSocket().write(buffer, callback);
        buffer = null;

        return success;
    };

    TCPSocket.prototype.writeString = function (message, encoding, callback) {
        if (typeof encoding === "undefined") { encoding = 'utf8'; }
        return this.getSocket().write(message, encoding, callback);
    };

    TCPSocket.prototype.onTimeout = function () {
        if (this.closeOnTimeout)
            this.getSocket().end();
    };

    TCPSocket.prototype.setCloseOnTimeout = function (flag) {
        this.closeOnTimeout = flag;
    };

    TCPSocket.prototype.getIdentifier = function () {
        return this.identifier;
    };

    TCPSocket.prototype.setIdentifier = function (identifier) {
        this.identifier = identifier;
    };
    return TCPSocket;
})(events.EventEmitter);
exports.TCPSocket = TCPSocket;
//# sourceMappingURL=tcp_socket.js.map
