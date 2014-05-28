import http = require('http');

import NodePublisherInterface = require('./interfaces/NodePublisherInterface');
import MyNodeInterface = require('../../../../topology/interfaces/MyNodeInterface');
import ContactNodeAddressListInterface = require('../../../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../../../topology/interfaces/ContactNodeAddressInterface');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import HttpServerInfo = require('../../../../net/interfaces/HttpServerInfo');

class HttpNodePublisher implements NodePublisherInterface {

	private _myNode:MyNodeInterface = null;
	private _serverList:HttpServerList = null;

	constructor (serverList:HttpServerList, myNode:MyNodeInterface) {
		this._serverList = serverList;

		this._myNode = myNode;
		this._myNode.onAddressChange(() => {
			this._publishMyNode();
		});

		this._publishMyNode();
	}

	public publish (myNode:MyNodeInterface):void {
		var addresses:ContactNodeAddressListInterface = myNode.getAddresses();
		if (addresses.length) {
			var json = {
				id: myNode.getId().toHexString(),
				addresses: []
			};

			for (var i=0; i<addresses.length; i++) {
				var address:ContactNodeAddressInterface = addresses[i];

				json.addresses.push({
					ip: address.getIp(),
					port: address.getPort()
				});
			}

			var jsonString = JSON.stringify(json);

			for (var i=0; i<this._serverList.length; i++) {
				this._postToServer(jsonString, this._serverList[i]);
			}
		}
	}

	private _publishMyNode ():void {
		this.publish(this._myNode);
	}

	private _postToServer (data:string, server:HttpServerInfo):void {
		var req = http.request({
			method: 'POST',
			hostname: server.hostname,
			port: server.port,
			path: server.path
		});

		req.end(data);
	}

}

export = NodePublisherInterface;