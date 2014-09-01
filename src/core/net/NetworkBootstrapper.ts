import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ExternalIPObtainerInterface = require('./ip/interfaces/ExternalIPObtainerInterface');
import NetworkBootstrapperInterface = require('./interfaces/NetworkBootstrapperInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');
import TCPSocketHandlerOptions = require('./tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketHandlerFactoryInterface = require('./tcp/interfaces/TCPSocketHandlerFactoryInterface');

import TCPSocketFactory = require('./tcp/TCPSocketFactory');

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
class NetworkBootstrapper implements NetworkBootstrapperInterface {

	/**
	 * Network configuration. Is used for getting the settings for TCP socket handler as well as the path for the open ports state.
	 *
	 * @member {core.config.ConfigInterface} core.net.NetworkBootstrapper~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The machine's external IP address.
	 *
	 * @member {string} core.net.tcp.NetworkBootstrapper~_externalIp
	 */
	private _externalIp:string = '';

	/**
	 * List of IP obtainers to use.
	 *
	 * @member {Array<core.net.ip.ExternalIPObtainerInterface>} core.net.NetworkBootstrapper~_ipObtainers
	 */
	private _ipObtainers:Array<ExternalIPObtainerInterface>;

	/**
	 * The timeout to recheck the external IP which always gets reset
	 *
	 * @member {number} core.net.NetworkBootstrapper~_ipRecheckInterval
	 */
	private _ipRecheckTimeout:number = 0;

	/**
	 * Stores the number of milliseconds to wait between two IP checks.
	 *
	 * @member {number} core.net.NetworkBootstrapper~_recheckIpEveryMs
	 */
	private _recheckIpEveryMs:number = 0;

	/**
	 * @member {core.utils.StateHandlerInterface} core.net.NetworkBootstrapper~_stateHandler
	 */
	private _openPortsStateHandler:StateHandlerInterface = null;

	/**
	 * The TCPSockhetHandler instance
	 *
	 * @member {core.net.tcp.TCPSocketHandlerInterface} core.net.NetworkBootstrapper~_tcpSocketHandler
	 */
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	/**
	 * TCPSocketHandler factory
	 *
	 * @member {core.net.tcp.TCPSocketHandlerFactoryInterface} core.net.NetworkBootstrapper~_tcpSocketHandlerFactory
	 */
	private _tcpSocketHandlerFactory:TCPSocketHandlerFactoryInterface = null;

	constructor (socketHandlerFactory:TCPSocketHandlerFactoryInterface, config:ConfigInterface, stateHandlerFactory:StateHandlerFactoryInterface, ipObtainers:Array<ExternalIPObtainerInterface>) {
		this._config = config;
		this._ipObtainers = ipObtainers;
		this._tcpSocketHandlerFactory = socketHandlerFactory;
		this._openPortsStateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('net.myOpenPortsStateConfig')));
		this._recheckIpEveryMs = this._config.get('net.recheckIpIntervalInSeconds') * 1000;
	}

	public bootstrap (callback:(err:Error) => any):void {
		this._getExternalIp((err:Error, ip:string) => {
			if (err) {
				return callback(err);
			}

			this._getTCPSocketHandlerOptions((options) => {
				this._externalIp = ip;

				this._tcpSocketHandler = this._tcpSocketHandlerFactory.create(new TCPSocketFactory(), options);

				this._tcpSocketHandler.autoBootstrap((openPorts:Array<number>) => {
					this._setIpRecheckTimeout();
					callback(null);
				});
			});
		});
	}

	/**
	 * Returns the external IP which has been obtained (or not)
	 *
	 * @returns {string} external ip
	 */
	public getExternalIp ():string {
		return this._externalIp;
	}

	public getTCPSocketHandler ():TCPSocketHandlerInterface {
		return this._tcpSocketHandler;
	}

	private _setIpRecheckTimeout ():void {
		if (this._ipRecheckTimeout) {
			global.clearTimeout(this._ipRecheckTimeout);
		}

		this._ipRecheckTimeout = global.setTimeout(() => {
			this._ipRecheckTimeout = 0;

			this._getExternalIp((err:Error, ip:string) => {

				if (ip && ip !== this._externalIp) {
					this._externalIp = ip;
					this._tcpSocketHandler.setMyExternalIp(ip);
				}

				this._setIpRecheckTimeout();
			});

		}, this._recheckIpEveryMs);
	}

	/**
	 * Iterates over the list of IP obtainers and tries to get the machine's external IP. If one fails, the next is used
	 * and so on.
	 *
	 * @method core.net.NetworkBootstapper~_getExternalIp
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
				// @todo IP should be transformed into a standardized format (especiall IPv6)

				callback(null, ip);
			}
		};

		doObtain(index);
	}

	/**
	 * Creates a TCPSocketHandlerOptions object using configuration provided in the constructor.
	 *
	 * @method core.net.NetworkBootstrapper~_getTCPSocketHandlerOptions
	 *
	 * @returns {core.net.tcp.TCPSocketHandlerOptions}
	 */
	private _getTCPSocketHandlerOptions (callback:(options:TCPSocketHandlerOptions) => any):void {
		this._openPortsStateHandler.load((err:Error, state:any) => {
			var myOpenPorts:Array<number> = state && state.openPorts ? state.openPorts : [];

			return callback({
				allowHalfOpenSockets     : this._config.get('net.allowHalfOpenSockets'),
				connectionRetry          : this._config.get('net.connectionRetrySeconds'),
				idleConnectionKillTimeout: this._config.get('net.idleConnectionKillTimeout'),
				heartbeatTimeout		 : this._config.get('net.heartbeatTimeout'),
				myExternalIp             : this._externalIp,
				myOpenPorts              : myOpenPorts,
				outboundConnectionTimeout: this._config.get('net.outboundConnectionTimeout'),
				simulatorRTT             : this._config.get('net.simulator.rtt')
			});
		});
	}

}

export = NetworkBootstrapper;
