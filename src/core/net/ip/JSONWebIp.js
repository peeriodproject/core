var http = require('follow-redirects').http;
var net = require('net');

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
var JSONWebIp = (function () {
    function JSONWebIp() {
        this._urlsToAtts = [
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
    }
    JSONWebIp.prototype.obtainIP = function (callback) {
        var _this = this;
        var startAt = -1;

        var check = function () {
            if (++startAt < _this._urlsToAtts.length) {
                var obj = _this._urlsToAtts[startAt];
                _this._queryForIp(obj.url, obj.att, function (err, ip) {
                    if (!ip) {
                        check();
                    } else {
                        callback(null, ip);
                    }
                });
            } else {
                callback(new Error('All JSON web servers exhausted.'), null);
            }
        };

        check();
    };

    JSONWebIp.prototype._queryForIp = function (url, att, callback) {
        var callbackCalled = false;
        var doCallback = function (err, ip) {
            if (!callbackCalled) {
                callbackCalled = true;
                callback(err, ip);
            }
        };

        http.get(url, function (res) {
            var body = '';

            if (res.statusCode === 200) {
                res.on('data', function (chunk) {
                    if (chunk) {
                        body += chunk.toString('utf8');
                    }
                }).on('end', function () {
                    var ip = null;
                    try  {
                        ip = JSON.parse(body)[att];
                    } catch (err) {
                        doCallback(err, null);
                        return;
                    }

                    if (net.isIP(ip)) {
                        doCallback(null, ip);
                    } else {
                        doCallback(new Error('Got no valid IP.'), null);
                    }
                });
            } else {
                doCallback(new Error('No 200 response.'), null);
            }
        }).on('error', function (err) {
            doCallback(err, null);
        }).on('socket', function (socket) {
            socket.on('error', function (err) {
                logger.debug('socket error');
            });
        });
    };
    return JSONWebIp;
})();

module.exports = JSONWebIp;
//# sourceMappingURL=JSONWebIp.js.map
