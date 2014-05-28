import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import RoutingTableInterface = require('../../../../topology/interfaces/RoutingTableInterface');

class RoutingTableNodeSeeker implements NodeSeekerInterface {

	private _routingTable:RoutingTableInterface = null;

	constructor (routingTable:RoutingTableInterface) {

		this._routingTable = null;
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