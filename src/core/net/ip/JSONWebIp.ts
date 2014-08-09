var http = require('follow-redirects').http;
import net = require('net');

import ExternalIPObtainerInterface = require('./interfaces/ExternalIPObtainerInterface');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * External IP Obtainer using:
 * http://freegeoip.net/json
 * http://ip.jsontest.com
 * http://ip-api.com/json
 *
 * @class core.net.ip.JSONWebIp
 * @implements core.net.ip.ExternalIPObtainerInterface
 */
class JSONWebIp implements ExternalIPObtainerInterface {

	private _urlsToAtts = [
		{
			"url": "http://discovery.franky102a.de/ip.php",
			"att": "ip"
		},
		{
			"url": "http://www.telize.com/jsonip",
			"att": "ip"
		},
		{
			"url": "http://ip.jsontest.com",
			"att": "ip"
		},
		{
			"url": "http://ip-api.com",
			"att": "query"
		},
		{
			"url": "http://ifconfig.me/all.json",
			"att": "ip_addr"
		},
		{
			"url": "http://wtfismyip.com/json",
			"att": "YourFuckingIPAddress"
		}
	];

	public obtainIP (callback:(err:Error, ip:string) => any) {
		var startAt = -1;

		var check = () => {
			if (++startAt < this._urlsToAtts.length) {
				var obj = this._urlsToAtts[startAt];
				this._queryForIp(obj.url, obj.att, (err:Error, ip:string) => {
					if (!ip) {
						check();
					}
					else {
						callback(null, ip);
					}
				});
			}
			else {
				callback(new Error('All JSON web servers exhausted.'), null);
			}
		}

		check();
	}

	private _queryForIp (url:string, att:string, callback:(err:Error, ip:string) => any) {
		var callbackCalled:boolean = false;
		var doCallback = function (err:Error, ip:string) {
			if (!callbackCalled) {
				callbackCalled = true;
				callback(err, ip);
			}
		};

		http.get(url, (res) => {
			var body = '';

			if (res.statusCode === 200) {
				res.on('data', function (chunk) {
					if (chunk) {
						body += chunk.toString('utf8');
					}
				}).on('end', () => {
					var ip = null;
					try {
						ip = JSON.parse(body)[att];
					}
					catch (err) {
						doCallback(err, null);
						return;
					}

					if (net.isIP(ip)) {
						doCallback(null, ip);
					}
					else {
						doCallback(new Error('Got no valid IP.'), null);
					}
				});
			}
			else {
				doCallback(new Error('No 200 response.'), null);
			}
		}).on('error', function (err) {
			doCallback(err, null);
		})
		.on('socket', function (socket) {
			socket.on('error', function (err) {
				logger.debug('socket error');
			});
		});
	}


}

export = JSONWebIp;