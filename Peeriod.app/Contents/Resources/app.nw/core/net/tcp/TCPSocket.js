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
        * Flag which indicates if an idle socket will be closed. This is true by default and only set to `false` if
        * otherwise stated in the constructor options.
        *
        * @member {boolean} core.net.tcp.TCPSocket~_closeWhenIdle
        */
        this._closeWhenIdle = true;
        this._closeAfterLastDataReceivedInMs = 0;
        this._idleTimeout = 0;
        this._heartbeatTimeout = 0;
        this._sendHeartbeatAfterLastDataInMs = 0;
        this._doKeepOpen = false;
        /**
        * The options passed in the constructor (for reference)
        *
        * @member {core.net.TCPSocketOptions} core.net.tcp.TCPSocket~_constructorOpts
        */
        this._constructorOpts = null;
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
        this._errorListener = null;
        this._closeListener = null;
        this._drainListener = null;
        this._dataListener = null;
        this._endListener = null;

        if (!(socket && socket instanceof net.Socket)) {
            throw new Error('TCPSocket.constructor: Invalid or no socket specified');
        }

        this.setSocket(socket);

        this._constructorOpts = opts;

        // disable nagle algorithm
        socket.setNoDelay();

        // set keep-alive
        if (opts.doKeepAlive) {
            this.getSocket().setKeepAlive(true, opts.keepAliveDelay || 180000);
        }

        this._simulatorRTT = opts.simulatorRTT || 0;

        // set the timeout
        if (opts.idleConnectionKillTimeout === 0) {
            this._closeWhenIdle = false;
        } else {
            this._closeAfterLastDataReceivedInMs = opts.idleConnectionKillTimeout * 1000;
        }

        this._sendHeartbeatAfterLastDataInMs = opts.heartbeatTimeout * 1000;

        this._setupListeners();

        this._resetIdleTimeout();
        this._resetHeartbeatTimeout();

        if (global.socketCount === undefined) {
            global.socketCount = 0;
        }

        global.socketCount++;
        //console.log('Number of open sockets %o', global.socketCount);
    }
    TCPSocket.prototype.end = function (data, encoding) {
        if (this._socket && !this._preventWrite) {
            this._preventWrite = true;

            this._clearHeartbeatAndIdleTimeouts();

            this._socket.end(data, encoding);
        }
    };

    TCPSocket.prototype.getIdentifier = function () {
        return this._identifier;
    };

    TCPSocket.prototype.getIP = function () {
        return this._socket.remoteAddress;
    };

    TCPSocket.prototype.getIPPortString = function () {
        return this._socket.remoteAddress + ':' + this._socket.remotePort;
    };

    TCPSocket.prototype.getSocket = function () {
        return this._socket;
    };

    TCPSocket.prototype.setKeepOpen = function (state) {
        this._doKeepOpen = state;
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

    TCPSocket.prototype._clearHeartbeatAndIdleTimeouts = function () {
        if (this._idleTimeout) {
            global.clearTimeout(this._idleTimeout);
            this._idleTimeout = null;
        }

        if (this._heartbeatTimeout) {
            global.clearTimeout(this._heartbeatTimeout);
            this._heartbeatTimeout = null;
        }
    };

    TCPSocket.prototype._setupListeners = function () {
        var _this = this;
        this._errorListener = function (err) {
            logger.error('THIS IS A SOCKET ERROR!', {
                emsg: err.message,
                //stack:err.stack,
                //trace: {
                // typeName: trace.getTypeName(),
                // fnName  : trace.getFunctionName(),
                // fileName: trace.getFileName(),
                // line    : trace.getLineNumber()
                // },
                ident: _this.getIdentifier()
            });

            _this._preventWrite = true;
            _this.emit('error', err);
        };
        this._socket.on('error', this._errorListener);

        this._closeListener = function (had_error) {
            _this._socket.destroy();

            _this._socket.removeListener('error', _this._errorListener);
            _this._socket.removeListener('close', _this._closeListener);
            _this._socket.removeListener('end', _this._endListener);
            _this._socket.removeListener('data', _this._dataListener);
            _this._socket.removeListener('drain', _this._drainListener);

            _this._preventWrite = true;
            _this._socket = null;

            _this.emit('close', had_error);

            _this._clearHeartbeatAndIdleTimeouts();

            process.nextTick(function () {
                _this.removeAllListeners();
            });

            global.socketCount--;
            //console.log('Number of open sockets %o', global.socketCount);
        };
        this._socket.on('close', this._closeListener);

        this._endListener = function () {
            _this._preventWrite = true;
            _this.emit('end');
        };
        this._socket.on('end', this._endListener);

        this._dataListener = function (data) {
            _this._resetIdleTimeout();

            _this.emit('data', data);
        };
        this._socket.on('data', this._dataListener);

        this._drainListener = function () {
            _this._resetHeartbeatTimeout();
        };
        this._socket.on('drain', this._drainListener);
    };

    TCPSocket.prototype._resetIdleTimeout = function () {
        var _this = this;
        if (this._idleTimeout) {
            global.clearTimeout(this._idleTimeout);
        }

        this._idleTimeout = global.setTimeout(function () {
            _this._idleTimeout = null;

            if (_this._closeWhenIdle) {
                _this.end();
            }
        }, this._closeAfterLastDataReceivedInMs);
    };

    TCPSocket.prototype._resetHeartbeatTimeout = function () {
        var _this = this;
        if (this._heartbeatTimeout) {
            global.clearTimeout(this._heartbeatTimeout);
        }

        this._heartbeatTimeout = global.setTimeout(function () {
            _this._heartbeatTimeout = null;

            if (_this._doKeepOpen) {
                _this.writeBuffer(new Buffer([0x00, 0x00, 0x00, 0x00]));
            } else {
                _this._resetHeartbeatTimeout();
            }
        }, this._sendHeartbeatAfterLastDataInMs);
    };

    TCPSocket.prototype.writeBuffer = function (buffer, callback) {
        var success = false;

        if (!this._preventWrite && this._socket.writable) {
            try  {
                success = this._socket.write(buffer, callback);

                if (success) {
                    this._resetHeartbeatTimeout();
                }
            } catch (e) {
                this._socket.end();
            }

            buffer = null;
        }

        return success;
    };

    TCPSocket.prototype.writeString = function (message, encoding, callback, forceAvoidSimulation) {
        if (typeof encoding === "undefined") { encoding = 'utf8'; }
        var success = false;

        if (!this._preventWrite && this._socket.writable) {
            try  {
                success = this.getSocket().write(message, encoding, callback);
                this._resetHeartbeatTimeout();
            } catch (e) {
                this._socket.end();
            }
        }

        return success;
    };

    /**
    * @deprecated
    *
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
