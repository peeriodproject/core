var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var net = require('net');

var logger = require('../../utils/logger/LoggerFactory').create();

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
        * @member {boolean} core.net.tcp.TCPSocket~_closeOnTimeout
        */
        this._closeOnTimeout = false;
        /**
        * The options passed in the constructor (for reference)
        *
        * @member {core.net.TCPSocketOptions} core.net.tcp.TCPSocket~_constructorOpts
        */
        this._constructorOpts = null;
        /**
        * List of event names of net.Socket which will be simply propagated on emission
        *
        * @member {string[]} core.net.tcp.TCPSocket~_eventsToPropagate
        */
        this._eventsToPropagate = ['data', 'close', 'end', 'error'];
        /**
        * Identification string.
        *
        * @member {string} core.net.tcp.TCPSocket~_identifier
        */
        this._identifier = '';
        /**
        * If this is set (for testing purposes only), this number of milliseconds) is
        * used to simulate a Round trip time. All writes to the socket are delayed by the specified ms.
        *
        * @member {number} core.net.tcp.TCPSocket~_simulatorRTT
        */
        this._simulatorRTT = 0;
        /**
        * node.js socket instance
        *
        * @member {net.Socket} core.net.tcp.TCPSocket~_socket
        */
        this._socket = null;
        this._preventWrite = false;

        if (!(socket && socket instanceof net.Socket)) {
            throw new Error('TCPSocket.constructor: Invalid or no socket specified');
        }

        this.setSocket(socket);

        this._constructorOpts = opts;

        // disable nagle algorithm
        socket.setNoDelay();

        // set keep-alive
        if (opts.doKeepAlive) {
            this.getSocket().setKeepAlive(true, opts.keepAliveDelay || 0);
        }

        this._simulatorRTT = opts.simulatorRTT || 0;

        // set the timeout
        if (opts.idleConnectionKillTimeout > 0) {
            this._closeOnTimeout = true;
            this.getSocket().setTimeout(opts.idleConnectionKillTimeout * 1000);
        }

        this.setupListeners();

        logger.info('added socket');
    }
    TCPSocket.prototype.end = function (data, encoding) {
        if (this.getSocket()) {
            this.getSocket().end(data, encoding);
        }
    };

    TCPSocket.prototype.forceDestroy = function () {
        /*if (this._socket) {
        logger.info('destroying socket');
        
        this._closeOnTimeout = false;
        
        try {
        //this.getSocket().removeAllListeners();
        this.getSocket().end();
        this.getSocket().destroy();
        }
        catch (e) {}
        this._socket = null;
        this.emit('destroy');
        this.removeAllListeners();
        }*/
        logger.error('Force destroy is deprecated.');
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
            this.end();
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

        socket.on('error', function () {
            _this._preventWrite = true;
            socket.destroy();
        });

        socket.on('close', function () {
            _this._preventWrite = true;
            _this._socket = null;

            _this.emit('destroy');

            process.nextTick(function () {
                _this.removeAllListeners();
            });
        });

        socket.on('end', function () {
            _this._preventWrite = true;
        });

        this._propagateEvents(this._eventsToPropagate);
    };

    TCPSocket.prototype.writeBuffer = function (buffer, callback, forceAvoidSimulation) {
        var _this = this;
        if (this._simulatorRTT && !forceAvoidSimulation) {
            global.setTimeout(function () {
                _this.writeBuffer(buffer, callback, true);
            }, this._simulatorRTT);
            return;
        }

        var success = false;

        if (!this._preventWrite) {
            try  {
                success = this.getSocket().write(buffer, callback);
            } catch (e) {
            }

            buffer = null;
        }

        return success;
    };

    TCPSocket.prototype.writeString = function (message, encoding, callback, forceAvoidSimulation) {
        var _this = this;
        if (typeof encoding === "undefined") { encoding = 'utf8'; }
        if (this._preventWrite)
            return;

        if (this._simulatorRTT && !forceAvoidSimulation) {
            global.setTimeout(function () {
                _this.writeString(message, encoding, callback, true);
            }, this._simulatorRTT);
            return;
        }

        var success = false;

        try  {
            success = this.getSocket().write(message, encoding, callback);
        } catch (e) {
        }

        return success;
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
                    _this.emit.apply(_this, [evt].concat(Array.prototype.splice.call(arguments, 0)));
                });
            })(event);
        });
    };
    return TCPSocket;
})(events.EventEmitter);

module.exports = TCPSocket;
//# sourceMappingURL=TCPSocket.js.map
