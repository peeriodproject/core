import path = require('path');

import NodeSeekerFactoryInterface = require('./interfaces/NodeSeekerFactoryInterface');
import NodeSeekerList = require('./interfaces/NodeSeekerList');
import StateHandlerInterface = require('../../../../utils/interfaces/StateHandlerInterface');
import JSONStateHandlerFactory = require('../../../../utils/JSONStateHandlerFactory');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import RoutingTableInterface = require('../../../../topology/interfaces/RoutingTableInterface');
import ContactNodeFactoryInterface = require('../../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeAddressFactoryInterface = require('../../../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressFactory = require('../../../../topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../../../topology/ContactNodeFactory');
import RoutingTableNodeSeeker = require('./RoutingTableNodeSeeker');
import HttpNodeSeeker = require('./HttpNodeSeeker');

/**
 * Currently creates:
 *
 * - RoutingTable node seeker
 * - HTTP server node seeker
 *
 * @class core.protocol.nodeDiscovery.NodeSeekerFactory
 * @implements core.protocol.nodeDiscovery.NodeSeekerFactoryInterface
 *
 * @param {core.config.ConfigInterface} appConfig
 * @oaram {core.topology.RoutingTableInterface} routingTable
 */
class NodeSeekerFactory implements NodeSeekerFactoryInterface {

	/**
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	/**
	 * @member {core.config.ConfigInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_appConfig
	 */
	private _appConfig:ConfigInterface = null

	/**
	 * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.NodeSeekerFactory~_httpServerList
	 */
	private _httpServerList:HttpServerList = null;

	/**
	 * @member {number} core.protocol.nodeDiscovery.NodeSeekerFactory~_httpServerTimeout
	 */
	private _httpServerTimeout:number = 0;

	/**
	 * @member {core.utils.JSONStateHandlerFactory} core.protocol.nodeDiscovery.NodeSeekerFactory~_jsonStateHandlerFactory
	 */
	private _jsonStateHandlerFactory:JSONStateHandlerFactory;

	/**
	 * @member {core.utils.StateHandlerInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_nodeDiscoveryState
	 */
	private _nodeDiscoveryState:StateHandlerInterface = null;

	/**
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_nodeFactory
	 */
	private _nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * @member {core.topology.RoutingTableInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	/**
	 * @member {core.protocol.nodeDiscovery.RoutingTableNodeSeeker} core.protocol.nodeDiscovery.NodeSeekerFactory~_routingTableNodeSeeker
	 */
	private _routingTableNodeSeeker:RoutingTableNodeSeeker = null;


	constructor (appConfig:ConfigInterface, routingTable:RoutingTableInterface) {
		this._appConfig = appConfig;
		this._jsonStateHandlerFactory = new JSONStateHandlerFactory();
		this._routingTable = routingTable;
		this._nodeFactory = new ContactNodeFactory();
		this._addressFactory = new ContactNodeAddressFactory();
		this._routingTableNodeSeeker = new RoutingTableNodeSeeker(this._routingTable);
	}

	public createSeekerList (callback:(list:NodeSeekerList) => any):void {
		this._nodeDiscoveryState = this._jsonStateHandlerFactory.create(path.resolve(this._appConfig.get('app.dataPath'), 'nodeDiscovery.json'));
		this._nodeDiscoveryState.load((err:Error, state:any) => {

			if (err) {
				callback([]);
				return;
			}

			var retList:NodeSeekerList = [this._routingTableNodeSeeker];

			this._httpServerList = state.nodeDiscovery.httpServerList;
			this._httpServerTimeout = state.nodeDiscovery.httpServerTimeout;

			if (this._httpServerList instanceof Array === true && this._httpServerList.length) {

				var httpSeeker:HttpNodeSeeker = new HttpNodeSeeker(this._httpServerList, this._httpServerTimeout);

				httpSeeker.setAddressFactory(this._addressFactory);
				httpSeeker.setNodeFactory(this._nodeFactory);
				retList.push(httpSeeker);
			}

			callback(retList);
		});
	}
}

export = NodeSeekerFactory;