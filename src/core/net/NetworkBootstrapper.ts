import NetworkBootstrapperInterface = require('./interfaces/NetworkBootstrapperInterface');
import TCPSocketHandlerOptions = require('./tcp/interfaces/TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketHandler = require('./tcp/TCPSocketHandler');
import ExternalIPObtainerInterface = require('./ip/interfaces/ExternalIPObtainerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');

/**
 * foobar
 * @class Test
 */
class NetworkBootstrapper implements NetworkBootstrapperInterface {
	private _externalIp:string = '';

	private _config:ConfigInterface = null;

	private _ipObtainers:Array<ExternalIPObtainerInterface>;

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
