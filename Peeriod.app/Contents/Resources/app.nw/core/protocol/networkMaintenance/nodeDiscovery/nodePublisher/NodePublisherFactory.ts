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

	/**
	 * @member {core.config.ConfigInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_protocolConfig
	 */
	private _protocolConfig:ConfigInterface = null;

	/**
	 * Number of seconds after which my node will be republished.
	 *
	 * @member {number} core.protocol.nodeDiscovery.NodePublisherFactory~_republishInSeconds
	 */
	private _republishInSeconds:number = 0;

	public constructor (appConfig:ConfigInterface, protocolConfig:ConfigInterface, myNode:MyNodeInterface) {
		this._appConfig = appConfig;
		this._protocolConfig = protocolConfig;
		this._republishInSeconds = protocolConfig.get('protocol.nodeDiscovery.republishInSeconds');
		this._myNode = myNode;
		this._jsonStateHandlerFactory = new JSONStateHandlerFactory();
	}

	public createPublisherList (callback:(list:NodePublisherList) => any):void {
		var statePath:string = path.resolve(this._appConfig.get('app.dataPath'), this._protocolConfig.get('protocol.nodeDiscovery.nodeSeekerFactoryStateConfig'));
		var fallbackStatePath:string = path.resolve(this._appConfig.get('app.internalDataPath'), this._protocolConfig.get('protocol.nodeDiscovery.nodeSeekerFactoryStateConfig'));


		this._nodeDiscoveryState = this._jsonStateHandlerFactory.create(statePath, fallbackStatePath);
		this._nodeDiscoveryState.load((err:Error, state:any) => {

			if (err) {
				return callback([]);
			}

			var retList:NodePublisherList = [];

			this._httpServerList = state.nodeDiscovery.httpServerList;

			if (this._httpServerList instanceof Array === true && this._httpServerList.length) {
				var httpPublisher:HttpNodePublisher = new HttpNodePublisher(this._httpServerList, this._myNode, this._republishInSeconds);

				retList.push(httpPublisher);
			}

			return callback(retList);
		});
	}
}

export = NodePublisherFactory;