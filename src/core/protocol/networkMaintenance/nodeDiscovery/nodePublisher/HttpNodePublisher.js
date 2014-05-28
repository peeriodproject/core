var http = require('http');

var HttpNodePublisher = (function () {
    function HttpNodePublisher(serverList, myNode) {
        var _this = this;
        this._myNode = null;
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

    HttpNodePublisher.prototype._publishMyNode = function () {
        this.publish(this._myNode);
    };

    HttpNodePublisher.prototype._postToServer = function (data, server) {
        var req = http.request({
            method: 'POST',
            hostname: server.hostname,
            port: server.port,
            path: server.path
        });

        req.end(data);
    };
    return HttpNodePublisher;
})();

module.exports = NodePublisherInterface;
//# sourceMappingURL=HttpNodePublisher.js.map
