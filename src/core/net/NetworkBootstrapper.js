var path = require('path');

var TCPSocketFactory = require('./tcp/TCPSocketFactory');

/**
* NetworkBootstraper implementation.
*
* @class core.net.NetworkBootstrapper
* @implements core.net.NetworkBootstrapperInterface
*
* @param {core.net.tcp.TCPSocketHandlerFactoryInterface} socketHandlerFactory
* @param {core.config.ConfigInterface} config The network configuration
* @parma {Array<core.net.ip.ExternalIPObtainerInterface>} A list of IP obtainers to use as tools to get the machine's external IP.
*/
var NetworkBootstrapper = (function () {
    function NetworkBootstrapper(socketHandlerFactory, config, stateHandlerFactory, ipObtainers) {
        /**
        * Network configuration. Is used for getting the settings for TCP socket handler as well as the path for the open ports state.
        *
        * @member {core.config.ConfigInterface} core.net.NetworkBootstrapper~_config
        */
        this._config = null;
        /**
        * The machine's external IP address.
        *
        * @member {string} core.net.tcp.NetworkBootstrapper~_externalIp
        */
        this._externalIp = '';
        /**
        * The timeout to recheck the external IP which always gets reset
        *
        * @member {number} core.net.NetworkBootstrapper~_ipRecheckInterval
        */
        this._ipRecheckTimeout = 0;
        /**
        * Stores the number of milliseconds to wait between two IP checks.
        *
        * @member {number} core.net.NetworkBootstrapper~_recheckIpEveryMs
        */
        this._recheckIpEveryMs = 0;
        /**
        * @member {core.utils.StateHandlerInterface} core.net.NetworkBootstrapper~_stateHandler
        */
        this._openPortsStateHandler = null;
        /**
        * The TCPSockhetHandler instance
        *
        * @member {core.net.tcp.TCPSocketHandlerInterface} core.net.NetworkBootstrapper~_tcpSocketHandler
        */
        this._tcpSocketHandler = null;
        /**
        * TCPSocketHandler factory
        *
        * @member {core.net.tcp.TCPSocketHandlerFactoryInterface} core.net.NetworkBootstrapper~_tcpSocketHandlerFactory
        */
        this._tcpSocketHandlerFactory = null;
        this._config = config;
        this._ipObtainers = ipObtainers;
        this._tcpSocketHandlerFactory = socketHandlerFactory;
        this._openPortsStateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('net.myOpenPortsStateConfig')));
        this._recheckIpEveryMs = this._config.get('net.recheckIpIntervalInSeconds') * 1000;
    }
    NetworkBootstrapper.prototype.bootstrap = function (callback) {
        var _this = this;
        this._getExternalIp(function (err, ip) {
            if (err) {
                return callback(err);
            }

            _this._externalIp = ip;

            _this._getTCPSocketHandlerOptions(function (options) {
                _this._tcpSocketHandler = _this._tcpSocketHandlerFactory.create(new TCPSocketFactory(), options);

                _this._tcpSocketHandler.autoBootstrap(function (openPorts) {
                    _this._setIpRecheckTimeout();
                    callback(null);
                });
            });
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

    NetworkBootstrapper.prototype._setIpRecheckTimeout = function () {
        var _this = this;
        if (this._ipRecheckTimeout) {
            global.clearTimeout(this._ipRecheckTimeout);
        }

        this._ipRecheckTimeout = global.setTimeout(function () {
            _this._ipRecheckTimeout = 0;

            _this._getExternalIp(function (err, ip) {
                if (ip && ip !== _this._externalIp) {
                    _this._externalIp = ip;
                    _this._tcpSocketHandler.setMyExternalIp(ip);
                }

                _this._setIpRecheckTimeout();
            });
        }, this._recheckIpEveryMs);
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
                // @todo IP should be transformed into a standardized format (especiall IPv6)
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
    NetworkBootstrapper.prototype._getTCPSocketHandlerOptions = function (callback) {
        var _this = this;
        this._openPortsStateHandler.load(function (err, state) {
            var myOpenPorts = state && state.openPorts ? state.openPorts : [];

            return callback({
                allowHalfOpenSockets: _this._config.get('net.allowHalfOpenSockets'),
                connectionRetry: _this._config.get('net.connectionRetrySeconds'),
                idleConnectionKillTimeout: _this._config.get('net.idleConnectionKillTimeout'),
                heartbeatTimeout: _this._config.get('net.heartbeatTimeout'),
                myExternalIp: _this._externalIp,
                myOpenPorts: myOpenPorts,
                outboundConnectionTimeout: _this._config.get('net.outboundConnectionTimeout'),
                simulatorRTT: _this._config.get('net.simulator.rtt')
            });
        });
    };
    return NetworkBootstrapper;
})();

module.exports = NetworkBootstrapper;
//# sourceMappingURL=NetworkBootstrapper.js.map
