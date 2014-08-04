var TCPSocketFactory = require('./tcp/TCPSocketFactory');

/**
* NetworkBootstraper implementation.
*
* @class core.net.NetworkBootstrapper
* @implements core.net.NetworkBootstrapperInterface
*
* @param {core.config.ConfigInterface} config The network configuration
* @parma {Array<core.net.ip.ExternalIPObtainerInterface>} A list of IP obtainers to use as tools to get the machine's external IP.
*/
var NetworkBootstrapper = (function () {
    function NetworkBootstrapper(socketHandlerFactory, config, ipObtainers) {
        /**
        * Network configuration. Is used for getting the settings for TCP socket handler.
        *
        * @member {core.config.ConfigInterface} NetworkBootstrapper~_config
        */
        this._config = null;
        /**
        * The machine's external IP address.
        *
        * @member {string} NetworkBootstrapper~_externalIp
        */
        this._externalIp = '';
        /**
        * The TCPSockhetHandler instance
        *
        * @member {core.net.tcp.TCPSocketHandlerInterface} NetworkBootstrapper~_tcpSocketHandler
        */
        this._tcpSocketHandler = null;
        /**
        * TCPSocketHandler factory
        *
        * @member {core.net.tcp.TCPSocketHandlerFactoryInterface} NetworkBootstrapper~_tcpSocketHandlerFactory
        */
        this._tcpSocketHandlerFactory = null;
        this._config = config;
        this._ipObtainers = ipObtainers;
        this._tcpSocketHandlerFactory = socketHandlerFactory;
    }
    NetworkBootstrapper.prototype.bootstrap = function (callback) {
        var _this = this;
        this._getExternalIp(function (err, ip) {
            if (err) {
                callback(err);
            } else {
                _this._externalIp = ip;

                _this._tcpSocketHandler = _this._tcpSocketHandlerFactory.create(new TCPSocketFactory(), _this._getTCPSocketHandlerOptions());

                _this._tcpSocketHandler.autoBootstrap(function (openPorts) {
                    callback(null);
                });
            }
        });
    };

    /**
    * Returns the external IP which has been obtained (or not)
    *
    * @returns {string} external ip
    */
    NetworkBootstrapper.prototype.getExternalIp = function () {
        return this._externalIp;
    };

    NetworkBootstrapper.prototype.getTCPSocketHandler = function () {
        return this._tcpSocketHandler;
    };

    /**
    * Iterates over the list of IP obtainers and tries to get the machine's external IP. If one fails, the next is used
    * and so on.
    *
    * @method core.net.NetworkBootstapper~_getExternalIp
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
    * @method core.net.NetworkBootstrapper~_getTCPSocketHandlerOptions
    *
    * @returns {core.net.tcp.TCPSocketHandlerOptions}
    */
    NetworkBootstrapper.prototype._getTCPSocketHandlerOptions = function () {
        return {
            allowHalfOpenSockets: this._config.get('net.allowHalfOpenSockets'),
            connectionRetry: this._config.get('net.connectionRetrySeconds'),
            idleConnectionKillTimeout: this._config.get('net.idleConnectionKillTimeout'),
            heartbeatTimeout: this._config.get('net.heartbeatTimeout'),
            myExternalIp: this._externalIp,
            myOpenPorts: this._config.get('net.myOpenPorts'),
            outboundConnectionTimeout: this._config.get('net.outboundConnectionTimeout'),
            simulatorRTT: this._config.get('net.simulator.rtt')
        };
    };
    return NetworkBootstrapper;
})();

module.exports = NetworkBootstrapper;
//# sourceMappingURL=NetworkBootstrapper.js.map
