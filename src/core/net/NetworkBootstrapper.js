var TCPSocketHandler = require('./tcp/TCPSocketHandler');

/**
* foobar
* @class Test
*/
var NetworkBootstrapper = (function () {
    function NetworkBootstrapper(config, ipObtainers) {
        this._externalIp = '';
        this._config = null;
        this._tcpSocketHandler = null;
        this._config = config;
        this._ipObtainers = ipObtainers;
    }
    NetworkBootstrapper.prototype.bootstrap = function (callback) {
        var _this = this;
        this._getExternalIp(function (err, ip) {
            if (err) {
                callback(err);
            } else {
                _this._externalIp = ip;

                _this._tcpSocketHandler = new TCPSocketHandler(_this._getTCPSocketHandlerOptions());

                _this._tcpSocketHandler.autoBootstrap(function (openPorts) {
                    callback(null);
                });
            }
        });
    };

    NetworkBootstrapper.prototype.getTCPSocketHandler = function () {
        return this._tcpSocketHandler;
    };

    NetworkBootstrapper.prototype._getExternalIp = function (callback) {
        var _this = this;
        if (!(this._ipObtainers && this._ipObtainers.length > 0)) {
            callback(new Error('NetworkBootstrapper: No IP obtainers specified.'), null);

            return;
        }

        var index = 0;
        var doObtain = function (i) {
            _this._ipObtainers[i].obtainIP(obtainCallback);
        };
        var obtainCallback = function (err, ip) {
            // got an error, but there's still other obtainers
            if (err && index < (_this._ipObtainers.length - 1)) {
                doObtain(++index);
            } else if (err) {
                callback(new Error('NetworkBootstrapper: All IP obtainers throw an error.'), null);
            } else {
                callback(null, ip);
            }
        };

        doObtain(index);
    };

    NetworkBootstrapper.prototype._getTCPSocketHandlerOptions = function () {
        return {
            allowHalfOpenSockets: this._config.get('net.allowHalfOpenSockets'),
            connectionRetry: this._config.get('net.connectionRetrySeconds'),
            idleConnectionKillTimeout: this._config.get('net.idleConnectionKillTimeout'),
            myExternalIp: this._externalIp,
            myOpenPorts: [this._config.get('net.myOpenPorts.0')]
        };
    };
    return NetworkBootstrapper;
})();

module.exports = NetworkBootstrapper;
//# sourceMappingURL=NetworkBootstrapper.js.map
