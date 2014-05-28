import http = require('http');

import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');
import NodeSeeker = require('./NodeSeeker');
import ContactNodeFactoryInterface = require('../../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import HttpServerInfo = require('../../../../net/interfaces/HttpServerInfo');

class HttpNodeSeeker extends NodeSeeker implements NodeSeekerInterface {

	private _serverList:HttpServerList = null;
	private _serverListLength:number = 0;

	constructor (serverList:HttpServerList) {
		super();

		this._serverList = serverList;
		this._serverListLength = this._serverList.length;
	}

	public seek (callback:(node:ContactNodeInterface) => any):void {
		var index:number = -1;
		var increaseAndQuery = () => {
			if (++index <= this._serverListLength - 1) {
				this._queryServerForNode(this._serverList[index], function (node:ContactNodeInterface) {
					if (node) {
						callback(node);
					}
					else {
						increaseAndQuery();
					}
				});
			}
			else {
				callback(null);
			}
		}

		increaseAndQuery();
	}

	private _queryServerForNode (remoteServer:HttpServerInfo, callback:(node:ContactNodeInterface) => any):void {
		var calledBack:boolean = false;

		var doCallback = function (node:ContactNodeInterface) {
			if (!calledBack) {
				calledBack = true;
				callback(node);
			}
		};

		var request = http.request({
			method: 'GET',
			hostname: remoteServer.hostname,
			port: remoteServer.port,
			path: remoteServer.path
		}, function (res) {

			var body = '';
			res.on('data', function (data) {
				body += data;
			});

			res.on('end', function (data) {
				if (data) {
					body += data;
				}

				if (res.statusCode === 200) {
					try {
						var node:ContactNodeInterface = this.nodeFromJSON(JSON.parse(body));

						doCallback(node);
					}
					catch (e) {
						doCallback(null);
					}
				}
				else {
					doCallback(null);
				}
			})

		});

		request.on('error', function () {
			doCallback(null);
		});

		request.end();
	}

}

export = HttpNodeSeeker;
