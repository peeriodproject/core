var http = require('follow-redirects').http;
import net = require('net');

import ExternalIPObtainerInterface = require('./interfaces/ExternalIPObtainerInterface');

/**
 * External IP obtainer using http://freegeoip.net
 *
 * @class core.net.ip.FreeGeoIp
 * @implements ExternalIPObtainerInterface
 */
class FreeGeoIp implements ExternalIPObtainerInterface {

	/**
	 * The URL to request.
	 *
	 * @private
	 * @member {string} FreeGeoIp~_url
	 */
	private _url = 'http://freegeoip.net/json/'

	/**
	 * The expected JSON attribute which holds the IP.
	 *
	 * @private
	 * @member {string} FreeGeoIp~_attribute
	 */
	private _attribute = 'ip';

	public obtainIP (callback:(err:Error, ip:string) => any) {
		var callbackCalled:boolean = false;
		var doCallback = function (err:Error, ip:string) {
			if (!callbackCalled) {
				callbackCalled = true;
				callback(err, ip);
			}
		};

		http.get(this._url, (res) => {
			var body = '';

			if (res.statusCode === 200) {
				res.on('data', function (chunk) {
					if (chunk) {
						body += chunk.toString('utf8');
					}
				}).on('end', () => {
					try {
						var ip = JSON.parse(body)[this._attribute];
						if (net.isIP(ip)) {
							doCallback(null, ip);
						}
						else {
							doCallback(new Error('FreeGeoIp: Got no valid IP.'), null);
						}
					}
					catch (err) {
						doCallback(err, null);
					}
				});
			}
			else {
				doCallback(new Error('FreeGeoIp: No 200 response.'), null);
			}
		}).on('error', function (err) {
			doCallback(err, null);
		});
	}

	/**
	 * Sets the expected JSON IP attribute.
	 *
	 * @param {string} attr
	 */
	public setIpAttribute (attr:string) {
		this._attribute = attr;
	}

	/**
	 * Sets the url.
	 *
	 * @param {string} url
	 */
	public setUrl (url:string) {
		this._url = url;
	}

}

export = FreeGeoIp;