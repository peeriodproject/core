var http = require('follow-redirects').http;
var net = require('net');

/**
* External IP obtainer using http://freegeoip.net
*
* @class core.net.ip.FreeGeoIp
* @implements ExternalIPObtainerInterface
*/
var FreeGeoIp = (function () {
    function FreeGeoIp() {
        /**
        * The URL to request.
        *
        * @private
        * @member {string} FreeGeoIp~_url
        */
        this._url = 'http://freegeoip.net/json/';
        /**
        * The expected JSON attribute which holds the IP.
        *
        * @private
        * @member {string} FreeGeoIp~_attr
        */
        this._attr = 'ip';
    }
    FreeGeoIp.prototype.obtainIP = function (callback) {
        var _this = this;
        var callbackCalled = false;
        var doCallback = function (err, ip) {
            if (!callbackCalled) {
                callbackCalled = true;
                callback(err, ip);
            }
        };

        http.get(this._url, function (res) {
            var body = '';
            if (res.statusCode === 200) {
                res.on('data', function (chunk) {
                    if (chunk) {
                        body += chunk.toString('utf8');
                    }
                }).on('end', function () {
                    try  {
                        var ip = JSON.parse(body)[_this._attr];
                        if (net.isIP(ip)) {
                            doCallback(null, ip);
                        } else {
                            doCallback(new Error('FreeGeoIp: Got no valid IP.'), null);
                        }
                    } catch (err) {
                        doCallback(err, null);
                    }
                });
            } else {
                doCallback(new Error('FreeGeoIp: No 200 response.'), null);
            }
        }).on('error', function (err) {
            doCallback(err, null);
        });
    };

    /**
    * Sets the expected JSON IP attribute.
    *
    * @param {string} attr
    */
    FreeGeoIp.prototype.setIpAttribute = function (attr) {
        this._attr = attr;
    };

    /**
    * Sets the url.
    *
    * @param {string} url
    */
    FreeGeoIp.prototype.setUrl = function (url) {
        this._url = url;
    };
    return FreeGeoIp;
})();

module.exports = FreeGeoIp;
//# sourceMappingURL=FreeGeoIp.js.map
