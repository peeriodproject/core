import path = require('path');

import NodePublisherFactoryInterface = require('./interfaces/NodePublisherFactoryInterface');
import NodePublisherList = require('./interfaces/NodePublisherList');
import StateHandlerInterface = require('../../../../utils/interfaces/StateHandlerInterface');
import JSONStateHandlerFactory = require('../../../../utils/JSONStateHandlerFactory');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import HttpNodePublisher = require('./HttpNodePublisher');
import MyNodeInterface = require('../../../../topology/interfaces/MyNodeInterface');

/**
 * Currently creates:
 *
 * - HTTP server node publisher
 *
 * @class core.protocol.nodeDiscovery.NodePublisherFactory
 * @implements core.protocol.nodeDiscovery.NodePublisherFactoryInterface
 *
 * @param {core.config.ConfigInterface} appConfig
 */
class NodePublisherFactory implements NodePublisherFactoryInterface {

	/**
	 * @member {core.config.ConfigInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_appConfig
	 */
	private _appConfig:ConfigInterface = null;

	/**
	 * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.NodePublisherFactory~_httpServerList
	 */
	private _httpServerList:HttpServerList = null;

	/**
	 * @member {core.utils.JSONStateHandlerFactory} core.protocol.nodeDiscovery.NodePublisherFactory~_jsonStateHandlerFactory
	 */
	private _jsonStateHandlerFactory:JSONStateHandlerFactory;

	/**
	 * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * @member {core.utils.StateHandlerInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_nodeDiscoveryState
	 */
	private _nodeDiscoveryState:StateHandlerInterface = null;

	public constructor (appConfig:ConfigInterface, myNode:MyNodeInterface) {
		this._appConfig = appConfig;
		this._myNode = myNode;
		this._jsonStateHandlerFactory = new JSONStateHandlerFactory();
	}

	public createPublisherList (callback:(list:NodePublisherList) => any):void {
		this._nodeDiscoveryState = this._jsonStateHandlerFactory.create(path.resolve(this._appConfig.get('app.dataPath'), 'nodeDiscovery.json'));
		this._nodeDiscoveryState.load((err:Error, state:any) => {

			if (err) {
				callback([]);
				return;
			}

			var retList:NodePublisherList = [];

			this._httpServerList = state.nodeDiscovery.httpServerList;

			if (this._httpServerList instanceof Array === true && this._httpServerList.length) {

				var httpPublisher:HttpNodePublisher = new HttpNodePublisher(this._httpServerList, this._myNode);

				retList.push(httpPublisher);
			}

			callback(retList);
		});
	}
}

export = NodePublisherFactory;