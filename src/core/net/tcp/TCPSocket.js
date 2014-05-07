var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var net = require('net');

/**
* TCP Socket implementation.
*
* @class core.net.tcp.TCPSocket
* @extends events.EventEmitter
* @implements core.net.tcp.TCPSocketInterface
*
* @param {net.Socket} node.js socket instance
* @param {core.net.tcp.TCPSocketOptions} options
*/
var TCPSocket = (function (_super) {
    __extends(TCPSocket, _super);
    function TCPSocket(socket, opts) {
        _super.call(this);
        /**
        * Flag which indicates if an idle socket will be closed on a `timeout` event.
        *
        * @member {boolean} TCPSocket~_closeOnTimeout
        */
        this._closeOnTimeout = false;
        /**
        * List of event names of net.Socket which will be simply propagated on emission
        *
        * @member {string[]} TCPSocket~_eventsToPropagate
        */
        this._eventsToPropagate = ['data', 'close', 'error'];
        /**
        * Identification string.
        *
        * @member {string} TCPSocket~_identifier
        */
        this._identifier = '';
        /**
        * node.js socket instance
        *
        * @member {net.Socket} TCPSocket~_socket
        */
        this._socket = null;
        /**
        * The options passed in the constructor (for reference)
        *
        * @member {core.net.TCPSocketOptions} TCPSocket~_constructorOpts
        */
        this._constructorOpts = null;

        if (!(socket && socket instanceof net.Socket)) {
            throw new Error('TCPSocket.constructor: Invalid or no socket specified');
        }

        this.setSocket(socket);

        this._constructorOpts = opts;

        // set keep-alive
        if (opts.doKeepAlive) {
            this.getSocket().setKeepAlive(true, opts.keepAliveDelay || 0);
        }

        // set the timeout
        if (opts.idleConnectionKillTimeout > 0) {
            this._closeOnTimeout = true;
            this.getSocket().setTimeout(opts.idleConnectionKillTimeout * 1000);
        }

        this.setupListeners();
    }
    TCPSocket.prototype.end = function (data, encoding) {
        this.getSocket().end(data, encoding);
    };

    TCPSocket.prototype.forceDestroy = function () {
        this.getSocket().removeAllListeners();
        try  {
            this.getSocket().end();
        } catch (e) {
        }
        this._socket = null;
        this.emit('destroy');
        this.removeAllListeners();
    };

    TCPSocket.prototype.getIdentifier = function () {
        return this._identifier;
    };

    TCPSocket.prototype.getIPPortString = function () {
        var socket = this.getSocket();

        return socket.remoteAddress + ':' + socket.remotePort;
    };

    TCPSocket.prototype.getSocket = function () {
        return this._socket;
    };

    TCPSocket.prototype.onTimeout = function () {
        if (this._closeOnTimeout) {
            this.forceDestroy();
        }
    };

    TCPSocket.prototype.setCloseOnTimeout = function (flag) {
        if (!this._closeOnTimeout && flag) {
            this.getSocket().setTimeout(this._constructorOpts.idleConnectionKillTimeout * 1000);
        }

        this._closeOnTimeout = flag;
    };

    TCPSocket.prototype.setIdentifier = function (identifier) {
        if (this._identifier && (this._identifier !== identifier)) {
            var oldIdentifier = this._identifier;
            this.emit('identifierChange', oldIdentifier, identifier);
        }
        this._identifier = identifier;
    };

    TCPSocket.prototype.setSocket = function (socket) {
        this._socket = socket;
    };

    TCPSocket.prototype.setupListeners = function () {
        var _this = this;
        var socket = this.getSocket();

        socket.on('timeout', function () {
            return _this.onTimeout();
        });

        this._propagateEvents(this._eventsToPropagate);
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

    /**
    * Takes an array of event names and propagates the corresponding node.js's net.Socket events,
    * so that the raw socket doesn't have to be accessed.
    *
    * @method core.net.tcp.TCPSocket~propagateEvents
    *
    * @param {Array<string>} events
    */
    TCPSocket.prototype._propagateEvents = function (events) {
        var _this = this;
        events.forEach(function (event) {
            (function (evt) {
                _this.getSocket().on(evt, function () {
                    return _this.emit.apply(_this, [evt].concat(Array.prototype.splice.call(arguments, 0)));
                });
            })(event);
        });
    };
    return TCPSocket;
})(events.EventEmitter);

module.exports = TCPSocket;
//# sourceMappingURL=TCPSocket.js.map
