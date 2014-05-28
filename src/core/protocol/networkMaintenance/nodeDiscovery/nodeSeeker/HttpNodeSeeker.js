var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require('http');

var NodeSeeker = require('./NodeSeeker');

var HttpNodeSeeker = (function (_super) {
    __extends(HttpNodeSeeker, _super);
    function HttpNodeSeeker(serverList) {
        _super.call(this);
        this._serverList = null;
        this._serverListLength = 0;

        this._serverList = serverList;
        this._serverListLength = this._serverList.length;
    }
    HttpNodeSeeker.prototype.seek = function (callback) {
        var _this = this;
        var index = -1;
        var increaseAndQuery = function () {
            if (++index <= _this._serverListLength - 1) {
                _this._queryServerForNode(_this._serverList[index], function (node) {
                    if (node) {
                        callback(node);
                    } else {
                        increaseAndQuery();
                    }
                });
            } else {
                callback(null);
            }
        };

        increaseAndQuery();
    };

    HttpNodeSeeker.prototype._queryServerForNode = function (remoteServer, callback) {
        var calledBack = false;

        var doCallback = function (node) {
            if (!calledBack) {
                calledBack = true;
                callback(node);
            }
        };

        var request = http.request({
            method: 'GET',
            hostname: remoteServer.hostname,
            port: remoteServer.port,
            path: remoteServer.path
        }, function (res) {
            var body = '';
            res.on('data', function (data) {
                body += data;
            });

            res.on('end', function (data) {
                if (data) {
                    body += data;
                }

                if (res.statusCode === 200) {
                    try  {
                        var node = this.nodeFromJSON(JSON.parse(body));

                        doCallback(node);
                    } catch (e) {
                        doCallback(null);
                    }
                } else {
                    doCallback(null);
                }
            });
        });

        request.on('error', function () {
            doCallback(null);
        });

        request.end();
    };
    return HttpNodeSeeker;
})(NodeSeeker);

module.exports = HttpNodeSeeker;
//# sourceMappingURL=HttpNodeSeeker.js.map
