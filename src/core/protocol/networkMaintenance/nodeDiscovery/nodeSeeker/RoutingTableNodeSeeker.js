/**
* A node seeker which returns a random node from a routing table.
* If none is found, `null` is returned.
*
* @class core.protocol.nodeDiscovery.RoutingTableNodeSeeker
* @implements core.protocol.nodeDiscovery.NodeSeekerInterface
*
* @param {core.topology.RoutingTableInterface} A routing table.
*/
var RoutingTableNodeSeeker = (function () {
    function RoutingTableNodeSeeker(routingTable) {
        /**
        * A routing table.
        *
        * @member {core.topology.RoutingTableInterface} core.protocol.nodeDiscovery.RoutingTableNodeSeeker~_routingTable
        */
        this._routingTable = null;
        this._routingTable = routingTable;
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
