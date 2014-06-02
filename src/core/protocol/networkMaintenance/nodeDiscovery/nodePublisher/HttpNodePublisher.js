var http = require('http');

/**
* NodePublisher which posts a JSON stringified representation of the contact information to a list of HTTP servers.
*
* @class core.protocol.nodeDiscovery.HttpNodePublisher
* @implements core.protocol.nodeDiscovery.NodePublisherInterface
*
* @param {core.net.HttpServerList} serverList A list of server the node can be published to
* @param {core.topology.MyNodeInterface} myNode My node.
*/
var HttpNodePublisher = (function () {
    function HttpNodePublisher(serverList, myNode) {
        var _this = this;
        /**
        * My node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.HttpNodePublisher~_myNode
        */
        this._myNode = null;
        /**
        * A list of HTTP servers my node can be published to.
        *
        * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.HttpNodePublisher~_serverList
        */
        this._serverList = null;
        this._serverList = serverList;

        this._myNode = myNode;
        this._myNode.onAddressChange(function () {
            _this._publishMyNode();
        });

        this._publishMyNode();
    }
    HttpNodePublisher.prototype.publish = function (myNode) {
        var addresses = myNode.getAddresses();
        if (addresses.length) {
            var json = {
                id: myNode.getId().toHexString(),
                addresses: []
            };

            for (var i = 0; i < addresses.length; i++) {
                var address = addresses[i];

                json.addresses.push({
                    ip: address.getIp(),
                    port: address.getPort()
                });
            }

            var jsonString = JSON.stringify(json);

            for (var i = 0; i < this._serverList.length; i++) {
                this._postToServer(jsonString, this._serverList[i]);
            }
        }
    };

    /**
    * @method core.protocol.nodeDiscovery.HttpNodePublisher~_publishMyNode
    */
    HttpNodePublisher.prototype._publishMyNode = function () {
        this.publish(this._myNode);
    };

    /**
    * POSTs a string of data to a server.
    *
    * @method core.protocol.nodeDiscovery.HttpNodePublisher~_postToServer
    *
    * @param {string} data The string to POST.
    * @param {core.net.HttpServerInfo} server The server to POST to.
    */
    HttpNodePublisher.prototype._postToServer = function (data, server) {
        var req = http.request({
            method: 'POST',
            hostname: server.hostname,
            port: server.port,
            path: server.path
        }, function (res) {
            console.log('sent data, status is: ' + res.statusCode);
        });

        req.end(data);
    };
    return HttpNodePublisher;
})();

module.exports = HttpNodePublisher;
//# sourceMappingURL=HttpNodePublisher.js.map
