import NetworkBootstrapperInterface = require('./interfaces/NetworkBootstrapperInterface');
import TCPSocketHandlerOptions = require('./tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketHandler = require('./tcp/TCPSocketHandler');
import ExternalIPObtainerInterface = require('./ip/interfaces/ExternalIPObtainerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');

/**
 * NetworkBootstraper implementation.
 *
 * @class core.net.NetworkBootstrapper
 * @implements core.net.NetowkrBootNetworkBootstrapperInterface
 *
 * @param {ConfigInterface} config The network configuration
 * @parma {Array<ExternalIPObtainerInterface>} A list of IP obtainers to use as tools to get the machine's external IP.
 */
class NetworkBootstrapper implements NetworkBootstrapperInterface {
	/**
	 * Network configuration. Is used for getting the settings for TCP socket handler.
	 *
	 * @private
	 * @member {ConfigInterface} NetworkBootstrapper~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The machine's external IP address.
	 *
	 * @private
	 * @member {string} NetworkBootstrapper~_externalIp
	 */
	private _externalIp:string = '';

	/**
	 * List of IP obtainers to use.
	 *
	 * @member {Array<ExternalIPObtainerInterface>} NetworkBootstrapper~_ipObtainers
	 */
	private _ipObtainers:Array<ExternalIPObtainerInterface>;

	/**
	 * The TCPSockhetHandler instance
	 *
	 * @private
	 * @member {TCPSocketHandlerInterface} NetworkBootstrapper~_tcpSocketHandler
	 */
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	constructor (config:ConfigInterface, ipObtainers:Array<ExternalIPObtainerInterface>) {
		this._config = config;
		this._ipObtainers = ipObtainers;
	}

	public bootstrap (callback:(err:Error) => any):void {
		this._getExternalIp((err:Error, ip:string) => {
			if (err) {
				callback(err);
			}
			else {
				this._externalIp = ip;

				this._tcpSocketHandler = new TCPSocketHandler(this._getTCPSocketHandlerOptions());

				this._tcpSocketHandler.autoBootstrap(function (openPorts:Array<number>) {
					callback(null);
				});
			}

		});
	}

	public getTCPSocketHandler ():TCPSocketHandlerInterface {
		return this._tcpSocketHandler;
	}

	/**
	 * Iterates over the list of IP obtainers and tries to get the machine's external IP. If one fails, the next is used
	 * and so on.
	 *
	 * @private
	 * @method NetworkBootstapper~_getExternalIp
	 *
	 * @param {Function} callback Function to call with an optional error and the retrieved IP as arguments.
	 */
	private _getExternalIp (callback:(err:Error, ip:string) => any):void {
		if (!(this._ipObtainers && this._ipObtainers.length > 0)) {
			callback(new Error('NetworkBootstrapper: No IP obtainers specified.'), null);

			return;
		}

		var index:number = 0;
		var doObtain:Function = (i) => {
			this._ipObtainers[i].obtainIP(obtainCallback);
		};
		var obtainCallback = (err:Error, ip:string) => {
			// got an error, but there's still other obtainers
			if (err && index < (this._ipObtainers.length - 1)) {
				doObtain(++index);
			}
			// got an error, and all obtainers are exhausted
			else if (err) {
				callback(new Error('NetworkBootstrapper: All IP obtainers throw an error.'), null);
			}
			// got an ip
			else {
				callback(null, ip);
			}
		};

		doObtain(index);
	}

	/**
	 * Creates a TCPSocketHandlerOptions object using configuration provided in the constructor.
	 *
	 * @private
	 * @method NetworkBootstrapper~_getTCPSocketHandlerOptions
	 *
	 * @returns {TCPSocketHandlerOptions}
	 */
	private _getTCPSocketHandlerOptions ():TCPSocketHandlerOptions {
		return <TCPSocketHandlerOptions> {
			allowHalfOpenSockets     : this._config.get('net.allowHalfOpenSockets'),
			connectionRetry          : this._config.get('net.connectionRetrySeconds'),
			idleConnectionKillTimeout: this._config.get('net.idleConnectionKillTimeout'),
			myExternalIp             : this._externalIp,
			myOpenPorts              : [this._config.get('net.myOpenPorts.0')]
		};
	}

}

export = NetworkBootstrapper;
