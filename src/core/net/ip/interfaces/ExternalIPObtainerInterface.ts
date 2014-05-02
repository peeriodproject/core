/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * ExternalIPObtainer are little helper classes pinging an external machine to help find a node its external IP address.
 * This can be implemented by either using another node, or sending a request to sites like "whatsmyip".
 * Their only method is `obtainIP` which gets the IP by their own logic and calls a callback with `err` and `ip` as arguments.
 *
 * @interface
 * @class core.net.ip.ExternalIPObtainerInterface
 */
interface ExternalIPObtainerInterface {

	/**
	 * Gets the external IP.
	 *
 	 * @param {Function} callback
	 */
	obtainIP(callback:(err:Error, ip:string) => any):void;
}

export = ExternalIPObtainerInterface;