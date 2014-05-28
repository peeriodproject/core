var RoutingTableNodeSeeker = (function () {
    function RoutingTableNodeSeeker(routingTable) {
        this._routingTable = null;
        this._routingTable = null;
    }
    RoutingTableNodeSeeker.prototype.seek = function (callback) {
        this._routingTable.getRandomContactNode(function (err, node) {
            if (!err && node) {
                callback(node);
            } else {
                callback(null);
            }
        });
    };
    return RoutingTableNodeSeeker;
})();

module.exports = RoutingTableNodeSeeker;
//# sourceMappingURL=RoutingTableNodeSeeker.js.map
