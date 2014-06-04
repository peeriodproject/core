/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var net = require('net');

var OutgoingTCPSocketObtainer = (function () {
    function OutgoingTCPSocketObtainer(port, ip, callback, factory, options, timeoutInMs) {
        var _this = this;
        this._factory = null;
        this._options = null;
        this._rawSocket = null;
        this._callback = null;
        this._timeoutInMs = 0;
        this._errorListener = null;
        this._connectListener = null;
        this._connectionTimeout = 0;
        this._factory = factory;
        this._options = options;
        this._callback = callback;
        this._timeoutInMs = timeoutInMs;

        this._errorListener = function () {
            //this._rawSocket.destroy();
            _this._rawSocket.removeListener('connect', _this._connectListener);
            _this._callback(null);
        };

        this._connectListener = function () {
            if (_this._connectionTimeout) {
                global.clearTimeout(_this._connectionTimeout);
            }

            var socket = _this._factory.create(_this._rawSocket, _this._options);

            _this._rawSocket.removeListener('error', _this._errorListener);

            _this._callback(socket);
        };

        this._connectionTimeout = global.setTimeout(function () {
            _this._rawSocket.end();

            //this._rawSocket.destroy();
            _this._rawSocket.removeListener('error', _this._errorListener);
            _this._rawSocket.removeListener('connect', _this._connectListener);
            _this._callback(null);
        }, this._timeoutInMs);

        this._rawSocket = net.createConnection(port, ip);

        this._rawSocket.once('error', this._errorListener);
        this._rawSocket.once('connect', this._connectListener);
    }
    return OutgoingTCPSocketObtainer;
})();

module.exports = OutgoingTCPSocketObtainer;
//# sourceMappingURL=OutgoingTCPSocketObtainer.js.map
