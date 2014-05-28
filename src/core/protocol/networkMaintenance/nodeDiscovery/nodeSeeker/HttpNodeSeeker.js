var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require('http');

var NodeSeeker = require('./NodeSeeker');

/**
* A node seeker which requests a list of HTTP servers, expecting a JSON representation of a single node.
*
* @class core.protocol.nodeDiscovery.HttpNodeSeeker
* @extends core.protocol.nodeDiscovery.NodeSeeker
* @implement core.protocol.nodeDiscovery.NodeSeekerInterface
*
* @param {core.net.HttpServerList} serverList A list of HTTP servers which can be requested
*/
var HttpNodeSeeker = (function (_super) {
    __extends(HttpNodeSeeker, _super);
    function HttpNodeSeeker(serverList) {
        _super.call(this);
        /**
        * A list of HTTP server which can be requested
        *
        * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.HttpNodeSeeker~_serverList
        */
        this._serverList = null;
        /**
        * Length of the server list.
        *
        * @member {number} core.protocol.nodeDiscovery.HttpNodeSeeker~_serverListLength
        */
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

    /**
    * Queries a server for a node. If none can be obtained, or the JSON conversion throws errors, the
    * provided callback is called with `null`.
    *
    * @method core.protocol.nodeDiscovery.HttpNodeSeeker~_queryServerForNode
    *
    * @param {core.net.HttpServerInfo} remoteServer
    * @param {Function} callback Function that gets called when the query has completed. A node or `null` is passed in
    * as argument.
    */
    HttpNodeSeeker.prototype._queryServerForNode = function (remoteServer, callback) {
        var _this = this;
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
                        var node = _this.nodeFromJSON(JSON.parse(body));

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
