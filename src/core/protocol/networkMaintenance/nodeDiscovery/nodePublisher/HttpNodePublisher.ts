import http = require('http');

import NodePublisherInterface = require('./interfaces/NodePublisherInterface');
import MyNodeInterface = require('../../../../topology/interfaces/MyNodeInterface');
import ContactNodeAddressListInterface = require('../../../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../../../topology/interfaces/ContactNodeAddressInterface');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import HttpServerInfo = require('../../../../net/interfaces/HttpServerInfo');

var logger = require('../../../../utils/logger/LoggerFactory').create();

/**
 * NodePublisher which posts a JSON stringified representation of the contact information to a list of HTTP servers.
 *
 * @class core.protocol.nodeDiscovery.HttpNodePublisher
 * @implements core.protocol.nodeDiscovery.NodePublisherInterface
 *
 * @param {core.net.HttpServerList} serverList A list of server the node can be published to
 * @param {core.topology.MyNodeInterface} myNode My node.
 */
class HttpNodePublisher implements NodePublisherInterface {

	/**
	 * My node.
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.HttpNodePublisher~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * Number of ms after which my node will be republished.
	 *
	 * @member {number} core.protocol.nodeDiscovery.HttpNodePublisher~_republishInSeconds
	 */
	private _republishInMs:number = 0;

	/**
	 * A list of HTTP servers my node can be published to.
	 *
	 * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.HttpNodePublisher~_serverList
	 */
	private _serverList:HttpServerList = null;

	constructor (serverList:HttpServerList, myNode:MyNodeInterface, republishInSeconds:number) {
		this._serverList = serverList;

		this._republishInMs = republishInSeconds * 1000;

		this._myNode = myNode;
		this._myNode.onAddressChange(() => {
			this._publishMyNode();
		});

		this._publishMyNode();

		this._setPublishTimeout();
	}

	public publish (myNode:MyNodeInterface):void {
		var addresses:ContactNodeAddressListInterface = myNode.getAddresses();

		if (addresses.length) {
			var json = {
				id       : myNode.getId().toHexString(),
				addresses: []
			};

			for (var i = 0; i < addresses.length; i++) {
				var address:ContactNodeAddressInterface = addresses[i];

				json.addresses.push({
					ip  : address.getIp(),
					port: address.getPort()
				});
			}

			var jsonString = JSON.stringify(json);

			for (var i = 0; i < this._serverList.length; i++) {
				this._postToServer(jsonString, this._serverList[i]);
			}
		}
	}

	/**
	 * @method core.protocol.nodeDiscovery.HttpNodePublisher~_publishMyNode
	 */
	private _publishMyNode ():void {
		this.publish(this._myNode);
	}

	/**
	 * POSTs a string of data to a server.
	 *
	 * @method core.protocol.nodeDiscovery.HttpNodePublisher~_postToServer
	 *
	 * @param {string} data The string to POST.
	 * @param {core.net.HttpServerInfo} server The server to POST to.
	 */
	private _postToServer (data:string, server:HttpServerInfo):void {
		var req = http.request({
			method  : 'POST',
			hostname: server.hostname,
			port    : server.port,
			path    : server.path,
			headers : {
				'Content-type': 'application/json; charset=utf-8',
				'Content-length': Buffer.byteLength(data)
			}
		});

		req.end(data);

		req.on('error', (err) => {
			logger.error('HTTP Node publisher error caught', {err: err.message});
		});
		req.on('socket', function (socket) {
			socket.on('error', (err) => {
				logger.error('HTTP Node publisher error caught SOCK', {err: err.message});
			});
		});
	}

	/**
	 * Sets the timeout after which my node is automatically republished.
	 *
	 * @method core.protocol.nodeDiscovery.HttpNodePublisher~_setPublishTimeout
	 */
	private _setPublishTimeout ():void {
		global.setTimeout(() => {
			this._publishMyNode();
			this._setPublishTimeout();
		}, this._republishInMs);
	}

}

export = HttpNodePublisher;