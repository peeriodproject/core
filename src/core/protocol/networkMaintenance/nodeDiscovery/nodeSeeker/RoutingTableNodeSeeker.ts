import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import RoutingTableInterface = require('../../../../topology/interfaces/RoutingTableInterface');

/**
 * A node seeker which returns a random node from a routing table.
 * If none is found, `null` is returned.
 *
 * @class core.protocol.nodeDiscovery.RoutingTableNodeSeeker
 * @implements core.protocol.nodeDiscovery.NodeSeekerInterface
 *
 * @param {core.topology.RoutingTableInterface} A routing table.
 */
class RoutingTableNodeSeeker implements NodeSeekerInterface {

	/**
	 * A routing table.
	 *
	 * @member {core.topology.RoutingTableInterface} core.protocol.nodeDiscovery.RoutingTableNodeSeeker~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	constructor (routingTable:RoutingTableInterface) {
		this._routingTable = routingTable;
	}

	public seek (callback:(node:ContactNodeInterface) => any):void {
		this._routingTable.getRandomContactNode((err:Error, node:ContactNodeInterface) => {
			if (!err && node) {
				callback(node);
			}
			else {
				callback(null);
			}
		});
	}
}

export = RoutingTableNodeSeeker;