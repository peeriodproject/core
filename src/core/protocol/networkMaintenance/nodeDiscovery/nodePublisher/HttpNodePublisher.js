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
    function HttpNodePublisher(serverList, myNode, republishInSeconds) {
        var _this = this;
        /**
        * My node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.HttpNodePublisher~_myNode
        */
        this._myNode = null;
        /**
        * Number of ms after which my node will be republished.
        *
        * @member {number} core.protocol.nodeDiscovery.HttpNodePublisher~_republishInSeconds
        */
        this._republishInMs = 0;
        /**
        * A list of HTTP servers my node can be published to.
        *
        * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.HttpNodePublisher~_serverList
        */
        this._serverList = null;
        this._serverList = serverList;

        this._republishInMs = republishInSeconds * 1000;

        this._myNode = myNode;
        this._myNode.onAddressChange(function () {
            _this._publishMyNode();
        });

        this._publishMyNode();

        this._setPublishTimeout();
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
        });

        req.end(data);

        req.on('error', function () {
        });
    };

    /**
    * Sets the timeout after which my node is automatically republished.
    *
    * @method core.protocol.nodeDiscovery.HttpNodePublisher~_setPublishTimeout
    */
    HttpNodePublisher.prototype._setPublishTimeout = function () {
        var _this = this;
        setTimeout(function () {
            _this._publishMyNode();
            _this._setPublishTimeout();
        }, this._republishInMs);
    };
    return HttpNodePublisher;
})();

module.exports = HttpNodePublisher;
//# sourceMappingURL=HttpNodePublisher.js.map
