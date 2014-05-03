var TCPSocketHandler = require('./tcp/TCPSocketHandler');

/**
* NetworkBootstraper implementation.
*
* @class core.net.NetworkBootstrapper
* @implements core.net.NetowkrBootNetworkBootstrapperInterface
*
* @param {ConfigInterface} config The network configuration
* @parma {Array<ExternalIPObtainerInterface>} A list of IP obtainers to use as tools to get the machine's external IP.
*/
var NetworkBootstrapper = (function () {
    function NetworkBootstrapper(config, ipObtainers) {
        /**
        * Network configuration. Is used for getting the settings for TCP socket handler.
        *
        * @private
        * @member {ConfigInterface} NetworkBootstrapper~_config
        */
        this._config = null;
        /**
        * The machine's external IP address.
        *
        * @private
        * @member {string} NetworkBootstrapper~_externalIp
        */
        this._externalIp = '';
        /**
        * The TCPSockhetHandler instance
        *
        * @private
        * @member {TCPSocketHandlerInterface} NetworkBootstrapper~_tcpSocketHandler
        */
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

    /**
    * Iterates over the list of IP obtainers and tries to get the machine's external IP. If one fails, the next is used
    * and so on.
    *
    * @private
    * @method NetworkBootstapper~_getExternalIp
    *
    * @param {Function} callback Function to call with an optional error and the retrieved IP as arguments.
    */
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

    /**
    * Creates a TCPSocketHandlerOptions object using configuration provided in the constructor.
    *
    * @private
    * @method NetworkBootstrapper~_getTCPSocketHandlerOptions
    *
    * @returns {TCPSocketHandlerOptions}
    */
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
